import { createApp } from 'vue'
import App from './app'
import { Book } from '../types'

import './styles/index.css'

// TODO: provide commonjs exports
// FIXME: handle hot update of stories
// FIXME: use `name` property instead of filenames universally for referencing books
// TODO: use eslint
// TODO: replace jsx with sfc
// TODO: try autoprefixer - https://github.com/postcss/autoprefixer

const modules = import.meta.globEager<{ default: Book }>('../dev/*/source.mjs')
const sidebarMap = new Map<string, string[]>()

for (const path in modules) {
  const { default: book } = modules[path]
  if (sidebarMap.has(book.name)) {
    console.warn(
      `Duplicate book name ${book.name}. This will override the previous entry.`
    )
  }
  sidebarMap.set(book.name, Object.keys(book.stories))
}
const app = createApp(App, { sidebarMap })
app.mount('#app')
