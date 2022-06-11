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

const root = process.cwd()
const rootHtmlPath = resolve(root, '.stato', 'index.html')
const rootScriptPath = resolve(root, '.stato', 'script.mjs')

async function initRootHtml() {
  await promises.writeFile(rootHtmlPath, Buffer.from(iframeDocument, 'utf-8'))
  console.log('created .stato/index.html')
}
async function initRootScript() {
  await promises.writeFile(rootScriptPath, Buffer.from(iframeScript, 'utf-8'))
  console.log('created .stato/script.mjs')
}

export async function init() {
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

    await initRootHtml()
    await initRootScript()
  } else {
    if (!existsSync(rootHtmlPath)) {
      await initRootHtml()
    }
    if (!existsSync(rootScriptPath)) {
      await initRootScript()
    }
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
