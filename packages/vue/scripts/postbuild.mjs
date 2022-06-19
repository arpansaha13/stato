import { existsSync, promises } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import pkg from '../package.json' assert { type: 'json' }

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

async function copyDir(src, dest) {
  await promises.mkdir(dest, { recursive: true })
  let entries = await promises.readdir(src, { withFileTypes: true })

  for (let entry of entries) {
    let srcPath = join(src, entry.name)
    let destPath = join(dest, entry.name)

    entry.isDirectory()
      ? await copyDir(srcPath, destPath)
      : await promises.copyFile(srcPath, destPath)
  }
}

async function postbuild() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  if (!existsSync(resolve(__dirname, '..', 'dist'))) {
    console.warn('No `dist` directory found - Prepack stage terminated.')
    process.exit()
  }

  await copyDir('./bin', './dist/bin')

  delete pkg.files
  delete pkg.scripts
  delete pkg.devDependencies

  pkg.main = pkg.main.replace('/dist', '')
  pkg.module = pkg.module.replace('/dist', '')
  pkg.types = pkg.types.replace('/dist', '')

  function truncatePkgPaths(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'object') truncatePkgPaths(obj[key])
      else obj[key] = obj[key].replace('/dist', '')
    }
  }
  truncatePkgPaths(pkg.exports)

  await promises.writeFile(
    resolve(__dirname, '..', 'dist', 'package.json'),
    Buffer.from(JSON.stringify(pkg, null, 2), 'utf-8')
  )
  await promises.writeFile(
    resolve(__dirname, '..', 'dist', 'src', 'index.html'),
    Buffer.from(mainDocument, 'utf-8')
  )
}

postbuild()
