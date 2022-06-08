import { createApp } from 'vue'
import App from './app'

import './styles/index.css'

// TODO: use eslint
// TODO: replace jsx with sfc

const modules = import.meta.globEager('../dev/*/source.mjs')
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
