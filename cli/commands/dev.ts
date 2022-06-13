import fg from 'fast-glob'
import { Argv } from 'mri'
import { existsSync, promises } from 'fs'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createServer, build, searchForWorkspaceRoot } from 'vite'
import { glob, globEager } from '../utils/globImport'
import vue from '@vitejs/plugin-vue'

import type { InlineConfig, WebSocketServer } from 'vite'
import type { RollupWatcher } from 'rollup'
import type { StatoConfig, IframeEnv, Book } from '../../types'

/**
 * @returns a promise for the imported config object from stato.config
 */
async function getConfig(): Promise<Readonly<StatoConfig>> {
  const root = process.cwd()

  const cjsStatoConfig = resolve(root, 'stato.config.cjs')
  const resolvedPath = (() => {
    const jsStatoConfig = resolve(root, 'stato.config.js')
    const mjsStatoConfig = resolve(root, 'stato.config.mjs')
    const tsStatoConfig = resolve(root, 'stato.config.ts')

    if (existsSync(cjsStatoConfig)) {
      return cjsStatoConfig
    } else if (existsSync(tsStatoConfig)) {
      return tsStatoConfig
    } else if (existsSync(jsStatoConfig)) {
      return jsStatoConfig
    } else if (existsSync(mjsStatoConfig)) {
      return mjsStatoConfig
    }
  })()

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
async function watchBook(entry: string, name: string) {
  const __dirname = dirname(fileURLToPath(import.meta.url))

  return (await build({
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
      watch: {},
      outDir: resolve(__dirname, '..', 'dev', name),
      emptyOutDir: false,
      rollupOptions: {
        external: ['vue'],
      },
    },
    esbuild: {
      minify: true,
    },
  })) as RollupWatcher
}

async function getData() {
  const __dirname = dirname(fileURLToPath(import.meta.url))

  const sourceModules = await globEager<{ default: Book }>(
    './dev/*/source.mjs',
    { cwd: resolve(__dirname, '..') }
  )
  const styleModules = await glob<CSSStyleSheet>('./dev/*/style.css', {
    cwd: resolve(__dirname, '..'),
  })

  const sidebarMap = new Map<string, string[]>()
  const bookStyleMap = new Map<string, () => Promise<CSSStyleSheet>>()

  for (const path in sourceModules) {
    const { default: book } = sourceModules[path]
    if (sidebarMap.has(book.name)) {
      console.warn(
        `Duplicate book name ${book.name}. This will override the previous entry.`
      )
    }
    sidebarMap.set(book.name, Object.keys(book.stories))
  }
  for (const path in styleModules) {
    const bookStyle = styleModules[path]

    const key = path.split('/')[2]
    bookStyleMap.set(key, bookStyle)
  }
  return { sidebarMap, bookStyleMap }
}

export async function dev(args: Argv) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  let iframeSocket: WebSocketServer | null = null

  // Bundle .stories.ts files
  const statoConfig = await getConfig()
  const bookPaths = await getBookPaths(statoConfig.content)
  console.log('bundling stories...')

  for (const entry of bookPaths) {
    const filename = basename(entry)
    const name = filename.substring(0, filename.indexOf('.stories.ts'))

    console.log(`\t> ${filename}`)
    const bundleWatcher = await watchBook(entry, name)

    // Wait for bundling to end
    await new Promise((resolve, reject) => {
      bundleWatcher.on('event', (event) => {
        if (event.code === 'BUNDLE_END') {
          resolve('bundled')
        } else if (event.code === 'ERROR') {
          reject('error')
        }
      })
    }).then(() => {
      if (!!iframeSocket) iframeSocket.send('stato-iframe:update-book', name)
    })
  }

  const { sidebarMap, bookStyleMap } = await getData()

  /** Send the required info for importing stories in client. */
  function sendStorySegments({
    bookName,
    storyName,
  }: {
    bookName: string
    storyName: string
  }) {
    /** path segment for dynamic import of styles */
    const stylePathSegment: string | null = bookStyleMap.has(bookName)
      ? bookName
      : null

    ;(iframeSocket as WebSocketServer).send('stato-iframe:select-story', {
      bookName,
      storyName,
      stylePathSegment,
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
              sendStorySegments(data)
            }
          )
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
