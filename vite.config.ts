import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuejsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vuejsx()],
  build: {
    target: 'es2020',
    lib: {
      entry: 'src/app.vue',
      name: 'app',
      formats: ['es'],
      fileName: () => 'app.mjs',
    },
    outDir: 'src/vite-dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['vue'],
    },
    minify: false,
  },
})
