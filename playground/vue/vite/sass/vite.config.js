import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  publicDir: 'static',
  optimizeDeps: {
    include: ['vue'],
  },
})
