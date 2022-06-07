import { createApp } from 'vue'
import App from './app'
import { Story } from '../types'

const modules = import.meta.globEager('../dev/*/source.mjs')
const storyMap = new Map<string, Story>()

const app = createApp(App, { storyMap })

for (const path in modules) {
  const { default: book } = modules[path]

  for (const story of Object.keys(book.stories)) {
    const key = `${book.name}/${story}`
    storyMap.set(key, book.stories[story])
  }
}
app.mount('#iframe')
