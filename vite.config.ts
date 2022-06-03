import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuejsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vuejsx()],
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'main',
      formats: ['es'],
      fileName: () => 'main.mjs',
    },
    emptyOutDir: false,
    rollupOptions: {
      external: ['vue'],
    },
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
})
