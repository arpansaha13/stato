import { createApp } from 'vue'
import App from './app'

import './styles/index.css'

const chunks = import.meta.globEager('../dev/*/index.mjs')
const modulesTable: Map<string, string[]> = new Map()

const app = createApp(App, { modulesTable })

for (const path in chunks) {
  const { default: mod } = chunks[path]
  modulesTable.set(mod.name, Object.keys(mod.stories))
}
app.mount('#app')
