import { Argv } from 'mri'
import fg from 'fast-glob'
import { join, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createServer, ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { AwastConfig } from '../types'

async function config(root: string): Promise<string[]> {
  const config: Readonly<AwastConfig> = await import(
    pathToFileURL(join(root, 'awast.config.js')).href
  ).then((r) => r.default ?? r)

  return fg(config.content)

  // const books: Readonly<Book>[] = []

  // for (const path of paths) {
  //   if (path.endsWith('.stories.ts')) {
  //     console.log(pathToFileURL(join(root, path)).href)
  //     const temp = await import(pathToFileURL(join(root, path)).href)
  //     console.log(temp)
  //     books.push(await import(join(root, path)))
  //   }
  // }
}

export async function dev(args: Argv) {
  const root = process.cwd()
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  const storyPaths = await config(root)

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
            app: resolve(__dirname, '../index.html'),
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
