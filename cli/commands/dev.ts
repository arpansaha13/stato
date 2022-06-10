import fg from 'fast-glob'
import { Argv } from 'mri'
import { existsSync, promises } from 'fs'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createServer, build, searchForWorkspaceRoot } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuejsx from '@vitejs/plugin-vue-jsx'

import type { InlineConfig, WebSocketServer } from 'vite'
import type { StatoConfig, IframeEnv } from '../../types'

/**
 * @returns a promise for the imported config object from stato.config
 */
async function config(): Promise<Readonly<StatoConfig>> {
  const root = process.cwd()

  const jsStatoConfig = resolve(root, 'stato.config.js')
  const tsStatoConfig = resolve(root, 'stato.config.ts')
  let config: Readonly<StatoConfig>

  async function importConfig(resolvedPath: string): Promise<StatoConfig> {
    return import(pathToFileURL(resolvedPath).href).then((r) => r.default ?? r)
  }

  if (existsSync(jsStatoConfig)) {
    config = await importConfig(jsStatoConfig)
  } else if (existsSync(tsStatoConfig)) {
    // compile -> import -> delete
    const outDir = '.stato'
    const name = 'stato.config.js'
    await build({
      root,
      logLevel: 'error',
      build: {
        lib: {
          entry: tsStatoConfig,
          formats: ['es'],
          fileName: () => name,
        },
        outDir,
        emptyOutDir: false, // Must be false
        sourcemap: false,
      },
    }).catch(() => {
      process.exit(1)
    })
    config = await importConfig(resolve(root, outDir, name))
    promises.unlink(resolve(root, outDir, name))
  } else {
    console.error(`No config file found at ${root}`)
    process.exit(1)
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
async function bundleBook(entry: string) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  const filename = basename(entry)
  const name = filename.substring(0, filename.indexOf('.stories.ts'))
  console.log(`\t> ${filename}`)
  await build({
    plugins: [vue()],
    root: resolve(__dirname, '..'),
    logLevel: 'error',
    build: {
      lib: {
        name,
        entry,
        formats: ['es'],
        fileName: () => 'source.mjs',
      },
      outDir: resolve(__dirname, '..', 'dev', name),
      watch: {},
      // emptyOutDir: false,
      rollupOptions: {
        external: ['vue'],
      },
    },
    esbuild: {
      minify: true,
    },
  })
}

export async function dev(args: Argv) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  // Bundle .stories.ts files
  const statoConfig = await config()
  const bookPaths = await getBookPaths(statoConfig.content)
  console.log('bundling stories...\n')

  for (const entry of bookPaths) {
    await bundleBook(entry)
  }

  const iframeEnv: IframeEnv = {
    IFRAME_SERVER_HOST: '',
    IFRAME_SERVER_PORT: -1,
  }
  let iframeSocket: WebSocketServer

  const commonServerConfig: InlineConfig = {
    configFile: false,
    mode: 'development',
  }
  const commonPlugins = [vue(), vuejsx()]

  const mainServerConfig: InlineConfig = {
    ...commonServerConfig,
    root: resolve(__dirname, '..', 'main'),
    cacheDir: 'node_modules/.vite_main',
    plugins: [
      ...commonPlugins,
      {
        name: 'stato-main',
        configureServer({ ws }) {
          ws.on('connection', () => {
            ws.send('stato-main:iframe-env', iframeEnv)
          })
          ws.on('stato-main:select-story', (activeStoryKey: string) => {
            iframeSocket.send('stato-iframe:select-story', activeStoryKey)
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
          app: resolve(__dirname, '..', 'main', 'index.html'),
        },
      },
    },
  }
  const iframeServerConfig: InlineConfig = {
    ...commonServerConfig,
    root: resolve(process.cwd(), '.stato'),
    cacheDir: '../node_modules/.vite-stato',
    plugins: [
      ...commonPlugins,
      {
        name: 'stato-iframe',
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
