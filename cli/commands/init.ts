import { resolve } from 'path'
import { existsSync, promises } from 'fs'
// import rimraf from 'rimraf'

const config = `module.exports = {
  // Path or glob patterns to stories
  content: [],
}
`
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
const iframeScript = `import '@stato/vue/context'

// your custom styles here
`

export async function init() {
  const root = process.cwd()
  const contextHtmlPath = resolve(root, '.stato', 'index.html')
  const contextScriptPath = resolve(root, '.stato', 'script.mjs')

  if (!existsSync('./stato.config.js')) {
    await promises.writeFile(
      resolve(root, 'stato.config.js'),
      Buffer.from(config, 'utf-8')
    )
    console.log('created stato.config.js')
  }

  if (!existsSync('./.stato')) {
    await promises.mkdir('./.stato')
    console.log('created .stato')
  }
  if (!existsSync(contextHtmlPath)) {
    await promises.writeFile(
      contextHtmlPath,
      Buffer.from(iframeDocument, 'utf-8')
    )
    console.log('created .stato/index.html')
  }
  if (!existsSync(contextScriptPath)) {
    await promises.writeFile(
      contextScriptPath,
      Buffer.from(iframeScript, 'utf-8')
    )
    console.log('created .stato/script.mjs')
  }

  // async function clearDevDir() {
  //   const __filename = fileURLToPath(import.meta.url)
  //   const __dirname = dirname(__filename)

  //   if (existsSync(resolve(__dirname, '..', 'dev'))) {
  //     rimraf(resolve(__dirname, '..', 'dev'), (err) => {
  //       console.log(err)
  //     })
  //   }
  // }
}
