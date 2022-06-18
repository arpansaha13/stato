import { existsSync, promises, statSync } from 'fs'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

import fg from 'fast-glob'
import rimraf from 'rimraf'
import chokidar from 'chokidar'
import maxBy from 'lodash/maxBy'
import { createServer, build, searchForWorkspaceRoot } from 'vite'
import vue from '@vitejs/plugin-vue'

import type { Argv } from 'mri'
import type { RollupWatcher } from 'rollup'
import type { InlineConfig, WebSocketServer } from 'vite'
import type { StatoConfig, IframeEnv } from '../../types'

const __dirname = dirname(fileURLToPath(import.meta.url))

export type BookHashMap = Map<string, { source: string; style: string | null }>
export type SidebarMap = Map<string, string[]>
/**
 * Get the hash of a bundled file from its path.
 * @param path path of the file
 */
function getFileHash(path: string) {
  return path.split('/').pop()?.split('-').pop()?.split('.')[0] as string
}

/**
 * Add a newly bundled book to sidebar map
 * @param bookName
 */
export async function addToSidebarMap(
  bookName: string,
  sidebarMap: SidebarMap
) {
  const sourceHash = getFileHash(
    (await fg(`../dev/${bookName}/source-*.mjs`, { cwd: __dirname }))[0]
  )
  const path = resolve(__dirname, `../dev/${bookName}/source-${sourceHash}.mjs`)
  const { default: book } = await import(pathToFileURL(path).href)

  if (sidebarMap.has(bookName)) {
    console.warn(
      `Duplicate book name ${bookName}. This will override the previous entry.`
    )
  }
  sidebarMap.set(bookName, Object.keys(book.stories))
}

/**
 * Get latest modified file path out of the given paths.
 * @param paths array of relative file paths
 * @returns the most recently updated file. If the `paths` array is empty, then null will be returned.
 */
function getUpdatedFile(paths: string[]) {
  if (paths.length === 0) return null

  return maxBy(paths, (path: string) => {
    // ctime = creation time
    return statSync(resolve(__dirname, path)).ctime
  }) as string
}

/**
 * Updates hash of source and .css files of the given book in the bookHashMap and returns the updated hashes
 * @param bookHashMap
 * @param bookName
 * @returns the updated hashes along with bookname
 */
async function addToBookHashMap(bookHashMap: BookHashMap, bookName: string) {
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

  // Will override if already present
  bookHashMap.set(bookName, { source: sourceHash, style: styleHash })
  return { bookName, sourceHash, styleHash }
}

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
 * @param entry path to book
 * @param bookName name of book
 */
async function watchBook(entry: string, bookName: string) {
  return build({
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
  }) as Promise<RollupWatcher>
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
  const sidebarMap: SidebarMap = new Map()

  /** Hashes of source and .css files of books */
  const bookHashMap: BookHashMap = new Map()

  /** Stores the bundle watchers of each book */
  const bundleWatcherMap = new Map<string, RollupWatcher>()

  let mainSocket: WebSocketServer
  let iframeSocket: WebSocketServer

  const statoConfig = await getConfig()

  chokidar
    .watch(statoConfig.content) // relative to root
    .on('add', async (path) => {
      const filename = basename(path)
      const bookName = filename.substring(0, filename.indexOf('.stories.ts'))

      console.log(`\t> ${filename}`)
      const bundleWatcher = await watchBook(resolve(path), bookName)

      // Store close handle for this build watcher
      bundleWatcherMap.set(bookName, bundleWatcher)

      await new Promise<void>((resolve, reject) => {
        bundleWatcher.on('event', async (event) => {
          if (event.code === 'BUNDLE_END') {
            if (iframeSocket !== null) {
              const updatedDetails = await addToBookHashMap(
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
      await addToSidebarMap(bookName, sidebarMap)
      await addToBookHashMap(bookHashMap, bookName)
      mainSocket.send('stato-main:sidebar-map', Array.from(sidebarMap))
    })
    .on('unlink', async (path) => {
      const filename = basename(path)
      const bookName = filename.substring(0, filename.indexOf('.stories.ts'))

      sidebarMap.delete(bookName)
      bookHashMap.delete(bookName)

      // Close build watcher
      await bundleWatcherMap.get(bookName)?.close()
      bundleWatcherMap.delete(bookName)

      rimraf(
        resolve(__dirname, '..', 'dev', bookName),
        { disableGlob: true },
        (err) => {
          if (err) console.error(err)
        }
      )
      mainSocket.send('stato-main:sidebar-map', Array.from(sidebarMap))
    })

  const iframeEnv: IframeEnv = {
    IFRAME_SERVER_HOST: '',
    IFRAME_SERVER_PORT: -1,
  }

  const mainServerConfig: InlineConfig = {
    configFile: false,
    mode: 'development',
    root: resolve(__dirname, '..', 'src'),
    cacheDir: resolve(process.cwd(), 'node_modules', '.vite-stato', 'src'),
    plugins: [
      vue(),
      {
        name: 'stato-main',
        configureServer({ ws }) {
          mainSocket = ws
          ws.on('connection', () => {
            ws.send('stato-main:iframe-env', iframeEnv)
            ws.send('stato-main:sidebar-map', Array.from(sidebarMap))
          })
          ws.on(
            'stato-main:select-story',
            (data: { bookName: string; storyName: string }) => {
              // Send the required info for importing stories in client.
              const sourceHash = bookHashMap.get(data.bookName)
                ?.source as string
              const styleHash = bookHashMap.get(data.bookName)?.style as
                | string
                | null

              iframeSocket.send('stato-iframe:select-story', {
                bookName: data.bookName,
                storyName: data.storyName,
                sourceHash,
                styleHash,
              })
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
      watch: {
        disableGlobbing: false,
      },
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
    configFile: false,
    mode: 'development',
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
