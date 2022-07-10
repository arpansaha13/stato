import { dirname, resolve } from 'path'
import { existsSync, promises } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const iframeDocument = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stato iframe</title>
  </head>
  <body>
    <div id="iframe"></div>
    <script type="module" src="./script.mjs"></script>
  </body>
</html>
`
const iframeScript = `import './context.mjs'

// your custom styles here
import './style.css'
`

export async function init() {
  const root = process.cwd()
  const contextSource = resolve(__dirname, '..', 'context', 'iframe.mjs')
  const contextDest = resolve(root, 'stato', 'context.mjs')
  const contextHtmlPath = resolve(root, 'stato', 'index.html')
  const contextScriptPath = resolve(root, 'stato', 'script.mjs')
  const contextStylePath = resolve(root, 'stato', 'style.css')

  if (!existsSync('./stato')) {
    await promises.mkdir('./stato')
    console.log('created stato')
  }
  if (!existsSync(contextHtmlPath)) {
    await promises.writeFile(
      contextHtmlPath,
      Buffer.from(iframeDocument, 'utf-8')
    )
    console.log('created stato/index.html')
  }
  if (!existsSync(contextScriptPath)) {
    await promises.writeFile(
      contextScriptPath,
      Buffer.from(iframeScript, 'utf-8')
    )
    console.log('created stato/script.mjs')
  }
  if (!existsSync(contextStylePath)) {
    await promises.writeFile(contextStylePath, Buffer.from('', 'utf-8'))
    console.log('created stato/style.css')
  }
  await promises.copyFile(contextSource, contextDest)
  console.log('created stato/context.mjs')
}
