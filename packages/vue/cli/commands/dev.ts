import { existsSync, promises } from 'fs'
import { basename, dirname, extname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

import rimraf from 'rimraf'
import chokidar from 'chokidar'
import { createServer, build } from 'vite'
import vue from '@vitejs/plugin-vue'

import type { Argv } from 'mri'
import type { InlineConfig, WebSocketServer } from 'vite'
import type { StatoConfig, IframeEnv } from '../../types'

const __dirname = dirname(fileURLToPath(import.meta.url))

type SidebarMap = Map<string, string[]>
type BookExtMap = Map<string, string>

/** The table of books and stories for the sidebar */
const sidebarMap: SidebarMap = new Map()
/** Record of extensions of book modules */
const bookExtMap: BookExtMap = new Map()

let mainSocket: WebSocketServer | undefined
let iframeSocket: WebSocketServer | undefined
let statoConfig: Readonly<StatoConfig>

function getBookName(filename: string): string {
  let end = filename.indexOf('.stories.ts')
  if (end === -1) end = filename.indexOf('.stories.js')
  if (end === -1) end = filename.indexOf('.stories.mjs')
  if (end === -1) end = filename.indexOf('.stories.cjs')
  return filename.substring(0, end)
}

/**
 * Updates the sidebar map or adds a newly bundled book to sidebar map. If the `bookName` is not present in the map then it will be added, else it will be overidden/updated.
 * @param bookName name of book
 * @param bookPath resolved path to book
 */
async function updateSidebarMap(bookName: string, bookPath: string) {
  // compile -> import -> delete
  const outDir = resolve(__dirname, '..', 'dev', bookName)
  await build({
    configFile: false,
    mode: 'development',
    plugins: [
      vue({
        // Do not transform static assets
        template: {
          transformAssetUrls: {
            includeAbsolute: false,
          },
        },
      }),
    ],
    root: resolve(__dirname, '..'),
    logLevel: 'error',
    build: {
      lib: {
        entry: bookPath,
        name: bookName,
        formats: ['es'],
        fileName: () => 'source.mjs',
      },
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        external: ['vue'],
      },
    },
    esbuild: {
      minify: true,
    },
  })
  const { default: book } = await import(
    pathToFileURL(resolve(outDir, 'source.mjs')).href
  )
  sidebarMap.set(bookName, Object.keys(book.stories))
  rimraf(outDir, { disableGlob: true }, (err) => {
    if (err) console.error(err)
  })
}

/**
 * @returns a promise for the imported config object from stato.config
 */
async function getConfig() {
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
    console.log(`No stato config file found at ${root}`)
    return
  }

  async function importConfig(resolvedPath: string): Promise<StatoConfig> {
    return import(pathToFileURL(resolvedPath).href).then((r) => r.default ?? r)
  }
  let config: Readonly<StatoConfig>

  if (resolvedPath === cjsStatoConfig) {
    config = await importConfig(resolvedPath)
  } else {
    // compile -> import -> delete
    const outDir = 'stato'
    const name = 'stato.config.cjs'
    await build({
      configFile: false,
      root,
      logLevel: 'error',
      publicDir: false, // Do not copy static assets
      build: {
        lib: {
          entry: resolvedPath,
          formats: ['cjs'],
          fileName: () => name,
        },
        outDir,
        manifest: false,
        emptyOutDir: false, // Must be false
        sourcemap: false,
      },
    })
    config = await importConfig(resolve(root, outDir, name))
    promises.unlink(resolve(root, outDir, name))
  }
  statoConfig = config
}

export async function dev(args: Argv) {
  await getConfig()

  chokidar
    .watch('stato/stories/**/*.stories.{js,ts}') // relative to root
    .on('add', async (path) => {
      const filename = basename(path)
      const bookName = getBookName(filename)
      const ext = extname(path)

      console.log(`\t> add ${filename}`)
      // Update sidebar map
      await updateSidebarMap(bookName, resolve(path))
      // Store the extension for importing from app
      bookExtMap.set(bookName, ext)
      mainSocket?.send('stato-main:sidebar', Array.from(sidebarMap))
    })
    .on('change', async (path) => {
      const filename = basename(path)
      const bookName = getBookName(filename)

      console.log(`\t> update ${filename}`)
      // Update sidebar map in case a story is added or removed
      await updateSidebarMap(bookName, resolve(path))
      mainSocket?.send('stato-main:sidebar', Array.from(sidebarMap))
    })
    .on('unlink', async (path) => {
      const filename = basename(path)
      const bookName = getBookName(filename)
      console.log(`\t> remove ${filename}`)

      sidebarMap.delete(bookName)
      mainSocket?.send('stato-main:sidebar', Array.from(sidebarMap))

      iframeSocket?.send('stato-iframe:book-unlinked', bookName)
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
            ws.send('stato-main:sidebar', Array.from(sidebarMap))
          })
          ws.on(
            'stato-main:select-story',
            (data: { bookName: string; storyName: string }) => {
              // Send the required info for importing stories in client.
              ;(iframeSocket as WebSocketServer).send(
                'stato-iframe:select-story',
                {
                  bookName: data.bookName,
                  storyName: data.storyName,
                  ext: bookExtMap.get(data.bookName),
                }
              )
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
        ignored: [resolve(__dirname, '..', 'src')],
      },
    },
    optimizeDeps: {
      include: ['vue'],
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
    root: resolve(process.cwd(), 'stato'),
    cacheDir: '../node_modules/.vite-stato/context',
    base: statoConfig.viteOptions?.base,
    publicDir: statoConfig.viteOptions?.publicDir
      ? resolve(process.cwd(), '..', statoConfig.viteOptions.publicDir)
      : '../public',
    plugins: [
      vue(),
      {
        name: 'stato-iframe',
        configureServer({ ws }) {
          iframeSocket = ws
        },
      },
    ],
    server: {
      port: 3800,
      watch: {
        ignored: [resolve(process.cwd(), 'stato', 'context.mjs')],
      },
    },
    optimizeDeps: {
      include: ['vue', 'vue/compiler-sfc'],
    },
    css: statoConfig.viteOptions?.css,
    build: {
      rollupOptions: {
        input: {
          app: resolve(process.cwd(), 'stato', 'index.html'),
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
