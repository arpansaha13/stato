import { createApp } from 'vue'
import App from './app'
import { Story } from '../types'

import './styles/index.css'

const modules = import.meta.globEager('../dev/*/source.mjs')

const sidebarMap = new Map<string, string[]>()
const storyMap = new Map<string, Story>()

const app = createApp(App, { sidebarMap, storyMap })

for (const path in modules) {
  const { default: book } = modules[path]
  if (sidebarMap.has(book.name)) {
    console.warn(
      `Duplicate book name ${book.name}. This will override the previous entry.`
    )
  }
  sidebarMap.set(book.name, Object.keys(book.stories))

  for (const story of Object.keys(book.stories)) {
    const key = `${book.name}/${story}`
    storyMap.set(key, book.stories[story])
  }
}
app.mount('#app')
