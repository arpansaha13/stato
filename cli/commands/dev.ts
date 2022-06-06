import { Argv } from 'mri'
import fg from 'fast-glob'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createServer, build } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuejsx from '@vitejs/plugin-vue-jsx'
import { AwastConfig } from '../../types'

// const bundleMap = new Map<string, Set<string>>()

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

// function pathToStory(book: string, story: string) {
//   return `../dev/${book}/story-${story}`
// }

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
      // minify: true,
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  })
  // bundleMap.set(name, new Set())
}

// function serveStory({ book, story }: { book: string; story: string }) {
//   if (!bundleMap.has(book)) {
//     console.error(`Could not find book ${book}.`)
//     return
//   }
//   if (!(bundleMap.get(book) as Set<string>).has(story)) {
//     // await bundleStories()
//     console.error(`Could not find story ${story} in book ${book}.`)
//     return
//   }
//   // const path = pathToStory(book, story)
// }

export async function dev(args: Argv) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  // Bundle .stories.ts files
  const storyPaths = await config()
  console.log('bundling stories...\n')
  for (const entry of storyPaths) {
    await bundleSource(entry)
  }

  try {
    const server = await createServer({
      configFile: false,
      plugins: [
        vue(),
        vuejsx(),
        {
          name: 'awast',
          configureServer(s) {
            s.ws.on('connection', () => {
              // s.ws.on('awast:reqStory', serveStory)
            })
          },
        },
      ],
      mode: 'development',
      server: {
        open: args.open ?? false,
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
