import { defineStatoConfig } from '@stato/vue'
import { resolve } from 'path'
// import Pages from 'vite-plugin-pages'
// import Layouts from 'vite-plugin-vue-layouts'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Unocss from 'unocss/vite'
import transformerDirective from '@unocss/transformer-directives'

export default defineStatoConfig({
  viteOptions: {
    plugins: [
      // Layouts({
      //   layoutsDirs: resolve(__dirname, 'src/layouts'),
      // }),

      // Pages({
      //   extensions: ['vue'],
      //   dirs: resolve(__dirname, 'src/pages'),
      // }),

      AutoImport({
        imports: [
          'vue',
          'vue-router',
          'vue/macros',
          '@vueuse/head',
          '@vueuse/core',
        ],
        dirs: [
          resolve(__dirname, 'src/composables'),
          resolve(__dirname, 'src/store'),
        ],
      }),

      Components({
        extensions: ['vue'],
        include: [/\.vue$/, /\.vue\?vue/],
        dirs: [resolve(__dirname, 'src/components')],
      }),

      Unocss({
        transformers: [transformerDirective()],
      }),
    ],
    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src'),
      },
    },
  },
})
