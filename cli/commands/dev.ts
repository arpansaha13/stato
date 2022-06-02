import { Argv } from 'mri'
import fg from 'fast-glob'
import rimraf from 'rimraf'
import { existsSync, promises } from 'fs'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createServer, build } from 'vite'
import vue from '@vitejs/plugin-vue'
import { AwastConfig } from '../../types'

async function createDevDir() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  if (existsSync(resolve(__dirname, '..', '.awast'))) {
    rimraf(resolve(__dirname, '..', '.awast'), (err) => {
      console.log(err)
      process.exit(1)
    })
    createDevDir()
  } else {
    await promises.mkdir(resolve(__dirname, '..', '.awast'))
    await promises.mkdir(resolve(__dirname, '..', '.awast', 'chunks'))
  }
}

export async function config(): Promise<string[]> {
  const root = process.cwd()

  const config: Readonly<AwastConfig> = await import(
    pathToFileURL(resolve(root, 'awast.config.js')).href
  ).then((r) => r.default ?? r)

  const paths = await fg(config.content)
  const resolvedPaths: string[] = []

  for (const path of paths.filter((v) => v.endsWith('.stories.ts'))) {
    resolvedPaths.push(resolve(root, path))
  }
  return resolvedPaths
}

async function bundleStories() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const storyPaths = await config()
  console.log('bundling stories...\n')

  for (const entry of storyPaths) {
    const filename = basename(entry)
    const name = filename.substring(0, filename.indexOf('.stories.ts'))
    console.log(`\t> ${filename}\n`)
    await build({
      plugins: [vue()],
      root: resolve(__dirname, '..', '.awast'),
      logLevel: 'error',
      build: {
        lib: {
          name,
          entry,
          formats: ['es'],
          fileName: () => `index.mjs`,
        },
        outDir: resolve(__dirname, '..', '.awast', 'chunks', name),
        emptyOutDir: false,
        rollupOptions: {
          external: ['vue'],
        },
      },
      esbuild: {
        // minify: true,
      },
    })
  }
}

export async function dev(args: Argv) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  await createDevDir()
  await bundleStories()
  const storyPaths = await config()

  try {
    const server = await createServer({
      configFile: false,
      plugins: [
        vue(),
        {
          name: 'awast',
          configureServer(server) {
            server.ws.on('connection', () => {
              server.ws.send('awast:storyPaths', storyPaths)
            })
          },
        },
      ],
      mode: 'development',
      server: {
        // open: args.open ?? false,
        open: false,
      },
      root: resolve(__dirname, '..'),
      build: {
        rollupOptions: {
          input: {
            app: resolve(__dirname, '..', 'index.html'),
          },
        },
      },
    })

    if (!server.httpServer) {
      throw new Error('HTTP server not available')
    }

    await server.listen()

    console.log('\nvite dev server running at:\n')
    server.printUrls()
  } catch (e: any) {
    console.error(`error when starting dev server:\n${e.stack}`)
    process.exit(1)
  }
}
