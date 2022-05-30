import { resolve } from 'path'
import { promises } from 'fs'

const config = `
  module.exports = {
    content: [],
  }
`

export async function init() {
  const root = process.cwd()

  await promises.writeFile(
    resolve(root, 'awast.config.js'),
    Buffer.from(config, 'utf-8')
  )
}
