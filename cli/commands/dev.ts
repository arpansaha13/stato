import fg from 'fast-glob'
import { Argv } from 'mri'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import {
  createServer,
  build,
  WebSocketServer,
  searchForWorkspaceRoot,
} from 'vite'
import vue from '@vitejs/plugin-vue'
import vuejsx from '@vitejs/plugin-vue-jsx'

import type { InlineConfig } from 'vite'
import type { StatoConfig, IframeEnv } from '../../types'

export async function config(): Promise<string[]> {
  const root = process.cwd()

  const config: Readonly<StatoConfig> = await import(
    pathToFileURL(resolve(root, 'stato.config.js')).href
  ).then((r) => r.default ?? r)

  const paths = await fg(config.content)
  const resolvedPaths: string[] = []

  for (const path of paths.filter((v) => v.endsWith('.stories.ts'))) {
    resolvedPaths.push(resolve(root, path))
  }
  return resolvedPaths
}

async function bundleSource(entry: string) {
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
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  })
}

export async function dev(args: Argv) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  // Bundle .stories.ts files
  const storyPaths = await config()
  console.log('bundling stories...\n')
  for (const entry of storyPaths) {
    await bundleSource(entry)
  }

  const iframeEnv: IframeEnv = {
    IFRAME_SERVER_HOST: '',
    IFRAME_SERVER_PORT: -1,
  }
  // let mainSocket: WebSocketServer
  let iframeSocket: WebSocketServer

  const serverConfig: InlineConfig = {
    configFile: false,
    mode: 'development',
  }
  const mainServerConfig: InlineConfig = {
    ...serverConfig,
    root: resolve(__dirname, '..', 'main'),
    cacheDir: 'node_modules/.vite_main',
    plugins: [
      vue(),
      vuejsx(),
      {
        name: 'stato-main',
        configureServer({ ws }) {
          // mainSocket = ws
          ws.on('connection', () => {
            ws.send('stato-main:iframe-env', iframeEnv)
            ws.on('stato-main:select-story', (activeStoryKey: string) => {
              iframeSocket.send('stato-iframe:select-story', activeStoryKey)
            })
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
    ...serverConfig,
    root: resolve(process.cwd(), '.stato'),
    cacheDir: '../node_modules/.vite-stato',
    plugins: [
      vue(),
      vuejsx(),
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
    console.log('\nvite dev server running at:\n')

    mainServer.printUrls()
  } catch (e: any) {
    console.error(`error when starting dev server:\n${e.stack}`)
    process.exit(1)
  }
}
