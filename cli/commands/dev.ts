import { Argv } from 'mri'
import fg from 'fast-glob'
import { dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
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

export async function dev(args: Argv) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

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
