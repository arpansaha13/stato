import { existsSync, promises } from 'fs'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { builtinModules } from 'module'
import { createHash } from 'crypto'

import rimraf from 'rimraf'
import chokidar from 'chokidar'
import omit from 'lodash/omit'
import { createServer, build, normalizePath } from 'vite'
import vue from '@vitejs/plugin-vue'

// Types
import type { Argv } from 'mri'
import type { InlineConfig, WebSocketServer } from 'vite'

import type { StatoConfig } from '../../types'
import type {
  IframeEnv,
  InitSidebarData,
  SidebarAddUpdateData,
  SidebarRemoveData,
} from '../../types/devTypes'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** A map of additions to perform to initialise the sidebar after connecting. Only new book additions will be recorded here. Book removals won't be recorded. */
const sidebarUpdates: InitSidebarData = {
  type: 'init sidebar',
  data: {},
}

let mainSocket: WebSocketServer
let iframeSocket: WebSocketServer
let statoConfig: Readonly<StatoConfig> | undefined

function verifyStatoDir() {
  const statoDirPath = resolve(process.cwd(), 'stato')
  if (!existsSync(statoDirPath)) {
    console.error(
      `Could not find "stato" directory in ${process.cwd()}. Run "stato init" to create it.`
    )
    process.exit(1)
  }
  if (!existsSync(resolve(statoDirPath, 'context.mjs'))) {
    console.error(
      `Could not find file "context.mjs" in ${statoDirPath}. Run "stato init" to create it.`
    )
    process.exit(1)
  }
}

async function getConfig() {
  const root = process.cwd()

  let resolvedPath: string | undefined
  const cjsStatoConfig = resolve(root, 'stato.config.cjs')
  const jsStatoConfig = resolve(root, 'stato.config.js')
  const mjsStatoConfig = resolve(root, 'stato.config.mjs')
  const tsStatoConfig = resolve(root, 'stato.config.ts')

  if (existsSync(cjsStatoConfig)) resolvedPath = cjsStatoConfig
  if (existsSync(tsStatoConfig)) resolvedPath = tsStatoConfig
  if (existsSync(jsStatoConfig)) resolvedPath = jsStatoConfig
  if (existsSync(mjsStatoConfig)) resolvedPath = mjsStatoConfig

  if (typeof resolvedPath === 'undefined') {
    return
  }
  console.log(`stato config file found: ${basename(resolvedPath)}`)

  async function importConfig(resolvedPath: string): Promise<StatoConfig> {
    return import(pathToFileURL(resolvedPath).href).then((r) => r.default ?? r)
  }
  let config: Readonly<StatoConfig>

  if (resolvedPath === cjsStatoConfig) {
    config = await importConfig(resolvedPath)
  } else {
    // compile -> import -> delete
    const name = 'stato.config.cjs'
    await build({
      configFile: false,
      // Keep mode as 'development', otherwise `__VUE_HMR_RUNTIME__` becomes `undefined` (Not sure why)
      mode: 'development',
      root,
      logLevel: 'error',
      publicDir: false, // Do not copy static assets
      build: {
        lib: {
          entry: resolvedPath,
          formats: ['cjs'],
          fileName: () => name,
        },
        outDir: root,
        manifest: false,
        emptyOutDir: false, // Must be false
        sourcemap: false,
        rollupOptions: {
          // Externalise node built-in modules so that they can be used in stato config
          external: [
            ...builtinModules,
            // Some dependencies of plugins may need the 'node:' prefix
            ...builtinModules.map((m: string) => `node:${m}`),
          ],
        },
      },
    })
    config = await importConfig(resolve(root, name))
    await promises.unlink(resolve(root, name))
  }
  statoConfig = config
}

/**
 * @param event
 * @param filePath path to file relative to root
 */
async function updateSidebarMap(
  event: 'add' | 'change' | 'unlink',
  filePath: string
) {
  const nPath = normalizePath(filePath)
  const fileName = basename(filePath)
  const truncFilePath = normalizePath(filePath).split('/').slice(2).join('/') // Remove 'stato/stories'

  function removeBook() {
    const data: SidebarRemoveData = {
      type: 'remove book',
      path: nPath,
      fileName,
    }
    delete sidebarUpdates.data[nPath]
    mainSocket.send({
      type: 'custom',
      event: 'stato-main:sidebar',
      data,
    })
  }
  if (event === 'unlink') {
    // The deleted file may have not been added (if it was not a module)
    if (!sidebarUpdates.data[nPath]) {
      return
    }
    // When a book is removed, if this book was imported anytime, vite hmr will reload the page
    // If the book was never imported, then no reload will happen
    // Just remove the book from the sidebar
    console.log(`\t> remove ${truncFilePath}`)
    removeBook()
    return
  }

  const hash = createHash('md5').update(filePath).digest('base64')

  // compile -> import -> delete
  const outDir = resolve(__dirname, '..', 'dev', hash)
  await build({
    configFile: false,
    mode: 'development',
    plugins: [
      ...(statoConfig?.viteOptions?.plugins ?? []),
      vue({
        // Do not transform static assets
        template: {
          transformAssetUrls: {
            includeAbsolute: false,
          },
        },
      }),
    ],
    publicDir: false,
    root: resolve(__dirname, '..'),
    logLevel: 'error',
    resolve: {
      alias: statoConfig?.viteOptions?.resolve?.alias,
    },
    build: {
      lib: {
        entry: resolve(filePath),
        formats: ['es'],
        fileName: () => 'source.mjs',
      },
      outDir,
      rollupOptions: {
        external: ['vue'],
      },
    },
    esbuild: {
      minify: true,
    },
  })

  // Add timestamp to force a fresh import
  const timestamp = Date.now()
  const { default: book } = await import(
    `${pathToFileURL(resolve(outDir, 'source.mjs')).href}?t=${timestamp}`
  )
  // Remove the build result
  rimraf(outDir, { disableGlob: true }, (err) => {
    if (err) console.error(err)
  })

  if (!book) {
    // If not a module
    if (!sidebarUpdates.data[nPath]) {
      return
    }
    console.log(`\t> remove ${truncFilePath}`)
    removeBook()
    return
  }
  const newlyAdded: boolean = !sidebarUpdates.data[normalizePath(filePath)]

  const data: SidebarAddUpdateData = {
    type: 'add/update book',
    fileName,
    path: normalizePath(filePath),
    storyNames: Object.keys(book.stories),
  }
  sidebarUpdates.data[normalizePath(filePath)] = omit(data, ['type'])
  mainSocket.send({
    type: 'custom',
    event: 'stato-main:sidebar',
    data,
  })
  if (newlyAdded) {
    console.log(`\t> add ${truncFilePath}`)
  }
}

function getPublicDir() {
  if (
    !statoConfig ||
    !statoConfig.viteOptions ||
    typeof statoConfig.viteOptions.publicDir === 'undefined'
  ) {
    return '../public'
  }
  if (statoConfig.viteOptions.publicDir === false) {
    return false
  }
  return resolve(process.cwd(), statoConfig.viteOptions.publicDir)
}

export async function dev(args: Argv) {
  verifyStatoDir()
  await getConfig()

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
            ws.send('stato-main:sidebar', sidebarUpdates)
          })
          ws.on(
            'stato-main:select-story',
            (data: {
              nesting: string[]
              fileName: string
              storyName: string
            }) => {
              // Send the required info for importing stories in client.
              iframeSocket.send({
                type: 'custom',
                event: 'stato-iframe:select-story',
                data: {
                  nesting: data.nesting,
                  fileName: data.fileName,
                  storyName: data.storyName,
                },
              })
            }
          )
          iframeSocket.on('connection', () => {
            ws.send('stato-main:iframe-connected')
          })
        },
      },
    ],
    server: {
      open: args.open ?? false,
      port: 3700,
      watch: {
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
    base: statoConfig?.viteOptions?.base,
    publicDir: getPublicDir(),
    resolve: {
      alias: statoConfig?.viteOptions?.resolve?.alias,
    },
    plugins: [
      ...(statoConfig?.viteOptions?.plugins ?? []),
      vue(),
      {
        name: 'stato-iframe',
        handleHotUpdate({ file, modules }) {
          // Handle hmr for *.stories.{js,ts} files manually
          if (file.endsWith('.stories.ts') || file.endsWith('.stories.js')) {
            iframeSocket.send({
              type: 'custom',
              event: 'stato-iframe:re-import',
            })
            // This file may have CSS importers registered by Tailwind JIT.
            // Return them so that Vite can hot update them
            return Array.from(modules[0].importers)
          }
        },
        configureServer({ ws }) {
          iframeSocket = ws
        },
      },
    ],
    server: {
      port: 3800,
    },
    optimizeDeps: {
      include: ['vue', 'vue/compiler-sfc'],
    },
    css: statoConfig?.viteOptions?.css,
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

  chokidar
    .watch('stato/stories/**/*.stories.{js,ts}' /* relative to root */, {
      ignored: (path) => {
        // Ignore dotfiles
        return /(^[.#]|(?:__|~)$)/.test(basename(path))
      },
    })
    .on('all', async (event, path) => {
      if (event === 'add' || event === 'change' || event === 'unlink') {
        // Update sidebar
        // during initial 'add' events (before 'ready')
        // if a story is added or removed
        // if the file just became a module (after creation) and needs to be added
        updateSidebarMap(event, path)
      }
    })
}
