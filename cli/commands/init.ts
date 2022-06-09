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
    <title>Awast iframe</title>
  </head>
  <body>
    <div id="iframe"></div>
    <script type="module" src="./script.mjs"></script>
  </body>
</html>
`
const iframeScript = `import 'awast/iframe/iframe.mjs'

// your custom styles here
`

const root = process.cwd()
const rootHtmlPath = resolve(root, '.awast', 'index.html')
const rootScriptPath = resolve(root, '.awast', 'script.mjs')

async function initRootHtml() {
  await promises.writeFile(rootHtmlPath, Buffer.from(iframeDocument, 'utf-8'))
  console.log('created .awast/index.html')
}
async function initRootScript() {
  await promises.writeFile(rootScriptPath, Buffer.from(iframeScript, 'utf-8'))
  console.log('created .awast/script.mjs')
}

export async function init() {
  if (!existsSync('./awast.config.js')) {
    await promises.writeFile(
      resolve(root, 'awast.config.js'),
      Buffer.from(config, 'utf-8')
    )
    console.log('created awast.config.js')
  }

  if (!existsSync('./.awast')) {
    await promises.mkdir('./.awast')
    console.log('created .awast')

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
}
