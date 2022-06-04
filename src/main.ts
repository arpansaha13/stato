import { createApp } from 'vue'
import App from './app'
import { Story } from '../types'

import './styles/index.css'

const chunks = import.meta.globEager('../dev/*/index.mjs')
const sidebarMap: Map<string, string[]> = new Map()
const storyMap: Map<string, Story> = new Map()

const app = createApp(App, { sidebarMap, storyMap })

for (const path in chunks) {
  const { default: book } = chunks[path]
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
