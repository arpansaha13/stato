import { existsSync, promises } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const mainDocument = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Stato</title>
      <link rel="stylesheet" href="./style.css">
    </head>
    <body>
      <div id="app"></div>
      <script type="module" src="./main.mjs"></script>
    </body>
  </html>
`

async function postbuild() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  if (!existsSync(resolve(__dirname, '..', 'dist'))) {
    console.warn('No `dist` directory found - Postbuild stage terminated.')
    process.exit()
  }

  await promises.writeFile(
    resolve(__dirname, '..', 'dist', 'src', 'index.html'),
    Buffer.from(mainDocument, 'utf-8')
  )
}

postbuild()
