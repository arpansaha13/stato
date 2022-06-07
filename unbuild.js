import { build } from 'unbuild'

await build('.', false, {
  rollup: {
    inlineDependencies: true,
  },
  entries: ['cli/index'],
  outDir: 'dist/cli',
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
}).catch(() => process.exit(1))

await build('.', false, {
  rollup: {
    inlineDependencies: true,
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  },
  entries: ['src/main'],
  outDir: 'dist/main',
  externals: ['vue'],
}).catch(() => process.exit(1))

await build('.', false, {
  rollup: {
    inlineDependencies: true,
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  },
  entries: ['context/iframe'],
  outDir: 'dist/iframe',
  externals: ['vue'],
}).catch(() => process.exit(1))
