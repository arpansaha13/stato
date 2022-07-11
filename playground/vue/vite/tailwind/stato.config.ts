import { defineStatoConfig } from '@stato/vue'
import { resolve } from 'path'

export default defineStatoConfig({
  viteOptions: {
    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src'),
      },
    },
  },
})
