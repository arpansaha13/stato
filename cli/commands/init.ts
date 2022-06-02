import { resolve } from 'path'
import { existsSync, promises } from 'fs'

const config = `module.exports = {
  content: [],
}
`

export async function init() {
  const root = process.cwd()

  if (!existsSync('./awast.config.js')) {
    await promises.writeFile(
      resolve(root, 'awast.config.js'),
      Buffer.from(config, 'utf-8')
    )
    console.log('created awast.config.js')
  }
}
