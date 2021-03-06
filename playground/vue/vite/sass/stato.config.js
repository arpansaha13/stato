import { defineStatoConfig } from '@stato/vue'
import { resolve } from 'path'

module.exports = defineStatoConfig({
  viteOptions: {
    resolve: {
      alias: {
        '@src': resolve(process.cwd(), 'src'),
      },
    },
    publicDir: 'static',
  },
})
