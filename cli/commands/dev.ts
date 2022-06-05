import { Argv } from 'mri'
import fg from 'fast-glob'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createServer, build } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuejsx from '@vitejs/plugin-vue-jsx'
import { AwastConfig } from '../../types'

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
          fileName: () => 'index.mjs',
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
  }
}

// async function getModulesTable() {
//   const chunks = import.meta.glob('../dev/*/index.mjs')
//   const sidebarMap: { [key: string]: string[] } = {}

//   for (const path in chunks) {
//     await chunks[path]().then(({ default: module }) => {
//       const storyNames = Object.keys(module.stories)
//       sidebarMap[module.name] = storyNames
//     })
//   }
//   return sidebarMap
// }

export async function dev(args: Argv) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  await bundleStories()
  // const sidebarMap = await getModulesTable()

  try {
    const server = await createServer({
      configFile: false,
      plugins: [
        vue(),
        vuejsx(),
        {
          name: 'awast',
          configureServer(s) {
            s.ws.on('connection', () => {})
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
