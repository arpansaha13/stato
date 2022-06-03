import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  rollup: {
    inlineDependencies: true,
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  },
  entries: ['cli/index', 'src/main'],
  outDir: 'dist/dist',
  externals: [
    'vue',
    'vite',
    'node:fs',
    'node:url',
    'node:buffer',
    'node:child_process',
    'node:process',
    'node:path',
    '@vitejs/plugin-vue',
    '@vitejs/plugin-vue-jsx',
  ],
})
