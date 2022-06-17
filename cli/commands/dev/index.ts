import fg from 'fast-glob'
import rimraf from 'rimraf'
import { Argv } from 'mri'
import { ref } from '@vue/reactivity'
import { existsSync, promises } from 'fs'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createServer, build, searchForWorkspaceRoot } from 'vite'
import { getData, getUpdatedFile, getFileHash } from './data'
import vue from '@vitejs/plugin-vue'

import type { Ref } from '@vue/reactivity'
import type { InlineConfig, WebSocketServer } from 'vite'
import type { RollupWatcher } from 'rollup'
import type { BookHashMap } from './data'
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
 * Updates hash of source and .css files of the given book in the bookHashMap and returns the updated hashes
 * @param bookHashMap
 * @param bookName
 * @returns the updated hashes along with bookname
 */
async function updateBookHashMap(
  bookHashMap: Ref<BookHashMap>,
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

  bookHashMap.value.set(bookName, { source: sourceHash, style: styleHash })
  return { bookName, sourceHash, styleHash }
}
/**
 * Watch and bundle a book
 * @param entry path to book
 * @param bookName name of book
 * @param iframeSocket
 * @param bookHashMap
 */
async function watchBook(
  entry: string,
  bookName: string,
  iframeSocket: Ref<WebSocketServer | null>,
  bookHashMap: Ref<BookHashMap | null>
) {
  const bundleWatcher = (await build({
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

  // Wait for bundling to end
  await new Promise<void>((resolve, reject) => {
    bundleWatcher.on('event', async (event) => {
      if (event.code === 'BUNDLE_END') {
        if (iframeSocket.value !== null) {
          const updatedDetails = await updateBookHashMap(
            bookHashMap as Ref<BookHashMap>,
            bookName
          )
          iframeSocket.value.send('stato-iframe:update-book', updatedDetails) // Send to iframe client for update
        }
        resolve()
      }
      if (event.code === 'ERROR') {
        reject()
      }
    })
  })
}
/** Send the required info for importing stories in client. */
function sendStorySegments(
  bookName: string,
  storyName: string,
  iframeSocket: Ref<WebSocketServer>,
  bookHashMap: Ref<BookHashMap>
) {
  const sourceHash = bookHashMap.value.get(bookName)?.source as string
  const styleHash = bookHashMap.value.get(bookName)?.style as string | null

  iframeSocket.value.send('stato-iframe:select-story', {
    bookName,
    storyName,
    sourceHash,
    styleHash,
  })
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

export async function dev(args: Argv) {
  await clearDevDir()

  /** The table of books and stories for the sidebar */
  let sidebarMap: Map<string, string[]>

  // Using ref so that it can be sent to watchBook() and sendStorySegments() as parameter and gets updated in the function scope
  /** Hashes of source and .css files of books */
  let bookHashMap = ref<BookHashMap | null>(null)
  let iframeSocket = ref<WebSocketServer | null>(null)

  // Bundle stories
  const statoConfig = await getConfig()
  const bookPaths = await getBookPaths(statoConfig.content)
  console.log('bundling stories...')

  for (const entry of bookPaths) {
    // Book name is the name of the file (except .stories.{js,ts})
    const filename = basename(entry)
    const bookName = filename.substring(0, filename.indexOf('.stories.ts'))

    console.log(`\t> ${filename}`)
    await watchBook(entry, bookName, iframeSocket, bookHashMap)
  }
  const data = await getData()
  sidebarMap = data.sidebarMap
  bookHashMap.value = data.bookHashMap

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
              sendStorySegments(
                data.bookName,
                data.storyName,
                iframeSocket as Ref<WebSocketServer>,
                bookHashMap as Ref<BookHashMap>
              )
            }
          )
          iframeSocket.value?.on('connection', () => {
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
          iframeSocket.value = ws
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
