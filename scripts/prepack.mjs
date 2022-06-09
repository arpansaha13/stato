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
      <title>Awast</title>
      <link rel="stylesheet" href="./index.css">
    </head>
    <body>
      <div id="app"></div>
      <script type="module" src="./main.mjs"></script>
    </body>
  </html>
`
// const iframeDocument = `
//   <!DOCTYPE html>
//   <html lang="en">
//     <head>
//       <meta charset="UTF-8" />
//       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//       <title>Awast iframe</title>
//     </head>
//     <body>
//       <div id="iframe"></div>
//       <script type="module" src="./script.mjs"></script>
//     </body>
//   </html>
// `

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

async function prepack() {
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

  await promises.writeFile(
    resolve(__dirname, '..', 'dist', 'package.json'),
    Buffer.from(JSON.stringify(pkg, null, 2), 'utf-8')
  )
  await promises.writeFile(
    resolve(__dirname, '..', 'dist', 'main', 'index.html'),
    Buffer.from(mainDocument, 'utf-8')
  )
  // await promises.writeFile(
  //   resolve(__dirname, '..', 'dist', 'iframe', 'index.html'),
  //   Buffer.from(iframeDocument, 'utf-8')
  // )
}

prepack()
