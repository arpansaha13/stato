import { defineStatoConfig } from '@stato/vue'

module.exports = defineStatoConfig({
  content: ['src/stories/**/*.stories.js'],
  viteOptions: {
    publicDir: 'static',
  },
})
