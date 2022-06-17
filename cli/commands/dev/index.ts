import fg from 'fast-glob'
import rimraf from 'rimraf'
import { Argv } from 'mri'
import { existsSync, promises } from 'fs'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createServer, build, searchForWorkspaceRoot } from 'vite'
import { getData, getUpdatedFile, getFileHash } from './data'
import vue from '@vitejs/plugin-vue'

import type { InlineConfig, WebSocketServer } from 'vite'
import type { RollupWatcher } from 'rollup'
import type { StatoConfig, IframeEnv } from '../../../types'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * @returns a promise for the imported config object from stato.config
 */
async function getConfig(): Promise<Readonly<StatoConfig>> {
  const root = process.cwd()

  let resolvedPath
  const cjsStatoConfig = resolve(root, 'stato.config.cjs')
  const jsStatoConfig = resolve(root, 'stato.config.js')
  const mjsStatoConfig = resolve(root, 'stato.config.mjs')
  const tsStatoConfig = resolve(root, 'stato.config.ts')

  if (existsSync(cjsStatoConfig)) resolvedPath = cjsStatoConfig
  if (existsSync(tsStatoConfig)) resolvedPath = tsStatoConfig
  if (existsSync(jsStatoConfig)) resolvedPath = jsStatoConfig
  if (existsSync(mjsStatoConfig)) resolvedPath = mjsStatoConfig

  if (typeof resolvedPath === 'undefined') {
    console.error(`No config file found at ${root}`)
    process.exit(1)
  }

  async function importConfig(resolvedPath: string): Promise<StatoConfig> {
    return import(pathToFileURL(resolvedPath).href).then((r) => r.default ?? r)
  }
  let config: Readonly<StatoConfig>

  if (resolvedPath === cjsStatoConfig) {
    config = await importConfig(resolvedPath)
  } else {
    // compile -> import -> delete
    const outDir = '.stato'
    const name = 'stato.config.cjs'
    await build({
      root,
      logLevel: 'error',
      build: {
        lib: {
          entry: resolvedPath,
          formats: ['cjs'],
          fileName: () => name,
        },
        outDir,
        emptyOutDir: false, // Must be false
        sourcemap: false,
      },
    })
    config = await importConfig(resolve(root, outDir, name))
    promises.unlink(resolve(root, outDir, name))
  }
  return config
}
/**
 * @param content the content array of stato.config
 * @returns a promise for the resolved paths to books
 */
async function getBookPaths(content: string[]): Promise<string[]> {
  const root = process.cwd()
  const paths = await fg(content)
  const resolvedPaths: string[] = []

  for (const path of paths.filter((v) => v.endsWith('.stories.ts'))) {
    resolvedPaths.push(resolve(root, path))
  }
  return resolvedPaths
}

/**
 * @param entry path to book
 */
async function watchBook(entry: string, bookName: string) {
  return (await build({
    plugins: [vue()],
    root: resolve(__dirname, '..'),
    logLevel: 'error',
    build: {
      lib: {
        entry,
        name: bookName,
        formats: ['es'],
        fileName: () => 'source-[hash].mjs',
      },
      watch: {},
      outDir: resolve(__dirname, '..', 'dev', bookName),
      emptyOutDir: false,
      rollupOptions: {
        external: ['vue'],
        output: {
          assetFileNames: 'style-[hash].[ext]', // For hashed .css files
        },
      },
    },
    esbuild: {
      minify: true,
    },
  })) as RollupWatcher
}

async function clearDevDir() {
  const devDir = resolve(__dirname, '..', 'dev')

  if (existsSync(devDir)) {
    await new Promise<void>((resolve, reject) => {
      rimraf(devDir, { disableGlob: true }, (err) => {
        if (err) {
          console.error(err)
          reject()
        }
        resolve()
      })
    })
  }
}
/**
 * Updated hash of source and .css files
 * @param bookHashMap
 * @param bookName
 */
async function updateBookHashMap(
  bookHashMap: Map<string, { source: string; style: string | null }>,
  bookName: string
) {
  const sourcePaths = await fg(`../dev/${bookName}/source-*.mjs`, {
    cwd: __dirname,
  })
  const stylePaths = await fg(`../dev/${bookName}/style-*.css`, {
    cwd: __dirname,
  })
  /** Hash part of the updated source file */
  const sourceHash = getFileHash(getUpdatedFile(sourcePaths) as string)
  /** Hash part of the updated .css file */
  const styleHash =
    stylePaths.length === 0
      ? null
      : getFileHash(getUpdatedFile(stylePaths) as string)

  bookHashMap.set(bookName, { source: sourceHash, style: styleHash })
  return { bookName, sourceHash, styleHash }
}

export async function dev(args: Argv) {
  await clearDevDir()

  /** The table of books and stories for the sidebar */
  let sidebarMap: Map<string, string[]>
  /** Hashes of source and .css files of books */
  let bookHashMap: Map<string, { source: string; style: string | null }>
  let iframeSocket: WebSocketServer | null = null

  // Bundle stories
  const statoConfig = await getConfig()
  const bookPaths = await getBookPaths(statoConfig.content)
  console.log('bundling stories...')

  for (const entry of bookPaths) {
    // Book name is the name of the file (except .stories.{js,ts})
    const filename = basename(entry)
    const bookName = filename.substring(0, filename.indexOf('.stories.ts'))

    console.log(`\t> ${filename}`)
    const bundleWatcher = await watchBook(entry, bookName)

    // Wait for bundling to end
    await new Promise<void>((resolve, reject) => {
      bundleWatcher.on('event', async (event) => {
        if (event.code === 'BUNDLE_END') {
          if (iframeSocket !== null) {
            const updatedDetails = await updateBookHashMap(
              bookHashMap,
              bookName
            )
            iframeSocket.send('stato-iframe:update-book', updatedDetails) // Send to iframe client for update
          }
          resolve()
        }
        if (event.code === 'ERROR') {
          reject()
        }
      })
    })
  }
  const data = await getData()
  sidebarMap = data.sidebarMap
  bookHashMap = data.bookHashMap

  /** Send the required info for importing stories in client. */
  function sendStorySegments(bookName: string, storyName: string) {
    const sourceHash = bookHashMap.get(bookName)?.source as string
    const styleHash = bookHashMap.get(bookName)?.style as string | null

    ;(iframeSocket as WebSocketServer).send('stato-iframe:select-story', {
      bookName,
      storyName,
      sourceHash,
      styleHash,
    })
  }

  const iframeEnv: IframeEnv = {
    IFRAME_SERVER_HOST: '',
    IFRAME_SERVER_PORT: -1,
  }
  const commonServerConfig: InlineConfig = {
    configFile: false,
    mode: 'development',
  }

  const mainServerConfig: InlineConfig = {
    ...commonServerConfig,
    root: resolve(__dirname, '..', 'src'),
    cacheDir: resolve(process.cwd(), 'node_modules', '.vite-stato', 'src'),
    plugins: [
      vue(),
      {
        name: 'stato-main',
        configureServer({ ws }) {
          ws.on('connection', () => {
            ws.send('stato-main:iframe-env', iframeEnv)
            ws.send('stato-main:sidebar-map', Array.from(sidebarMap))
          })
          ws.on(
            'stato-main:select-story',
            (data: { bookName: string; storyName: string }) => {
              sendStorySegments(data.bookName, data.storyName)
            }
          )
          iframeSocket?.on('connection', () => {
            ws.send('stato-main:iframe-connected')
          })
        },
      },
    ],
    server: {
      open: args.open ?? false,
      port: 3700,
    },
    build: {
      rollupOptions: {
        input: {
          app: resolve(__dirname, '..', 'src', 'index.html'),
        },
      },
    },
  }
  const iframeServerConfig: InlineConfig = {
    ...commonServerConfig,
    root: resolve(process.cwd(), '.stato'),
    cacheDir: '../node_modules/.vite-stato/context',
    plugins: [
      vue(),
      {
        name: 'stato-iframe',
        handleHotUpdate() {
          return []
        },
        configureServer({ ws }) {
          iframeSocket = ws
        },
      },
    ],
    server: {
      port: 3800,
      fs: {
        allow: [
          searchForWorkspaceRoot(process.cwd()),
          resolve(__dirname, '..', 'dev'),
        ],
      },
    },
    optimizeDeps: {
      exclude: ['@stato/vue/context'], // Imported in .stato/script.mjs - should not be pre-bundled
    },
    build: {
      rollupOptions: {
        input: {
          app: resolve(process.cwd(), '.stato', 'index.html'),
        },
      },
    },
  }

  try {
    const iframeServer = await createServer(iframeServerConfig)
    if (!iframeServer.httpServer) {
      throw new Error('HTTP server not available')
    }
    await iframeServer.listen()

    const address = iframeServer.httpServer.address()
    if (address !== null && typeof address !== 'string') {
      iframeEnv.IFRAME_SERVER_HOST = address.address
      iframeEnv.IFRAME_SERVER_PORT = address.port
    }

    const mainServer = await createServer(mainServerConfig)
    if (!mainServer.httpServer) {
      throw new Error('HTTP server not available')
    }
    await mainServer.listen()
    console.log('\nvite dev server for stato running at:\n')

    mainServer.printUrls()
  } catch (e: any) {
    console.error(`error when starting dev server:\n${e.stack}`)
    process.exit(1)
  }
}
