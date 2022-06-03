import { createApp } from 'vue'
import App from './app'

import './styles/index.css'

const chunks = import.meta.globEager('../dev/*/index.mjs')
const modulesTable: { [key: string]: string[] } = {}

for (const path in chunks) {
  const { default: mod } = chunks[path]
  console.log(mod)
  const storyNames = Object.keys(mod.stories)
  modulesTable[mod.name] = storyNames
}
const app = createApp(App, { modulesTable })
app.mount('#app')
