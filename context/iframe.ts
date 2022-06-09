import { createApp } from 'vue'
import App from './app'
import { Story } from '../types'

const modules = import.meta.globEager('../dev/*/source.mjs')
const moduleStyles = import.meta.glob('../dev/*/style.css')

const storyMap = new Map<string, Story>()
for (const path in modules) {
  const { default: book } = modules[path]

  for (const story of Object.keys(book.stories)) {
    const key = `${book.name}/${story}`
    storyMap.set(key, book.stories[story])
  }
}

// Styles of each book
const bookStyleMap = new Map<string, () => Promise<{ [key: string]: any }>>()
for (const path in moduleStyles) {
  const bookStyle = moduleStyles[path]

  const key = path.split('/')[2]
  bookStyleMap.set(key, bookStyle)
}
createApp(App, { storyMap, bookStyleMap }).mount('#iframe')
