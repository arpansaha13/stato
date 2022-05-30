import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  rollup: {
    inlineDependencies: true,
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
    'node:os',
    '@vitejs/plugin-vue',
  ],
})
