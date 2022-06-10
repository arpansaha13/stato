import { build } from 'unbuild'

await build('.', false, {
  rollup: {
    inlineDependencies: true,
    esbuild: {
      minify: true,
    },
  },
  entries: ['cli/index'],
  outDir: 'dist/cli',
  dependencies: ['vue', 'vite', '@vitejs/plugin-vue', '@vitejs/plugin-vue-jsx'],
  externals: [
    'node:fs',
    'node:url',
    'node:buffer',
    'node:child_process',
    'node:process',
    'node:path',
  ],
}).catch(() => process.exit(1))

await build('.', false, {
  rollup: {
    inlineDependencies: true,
    esbuild: {
      minify: true,
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  },
  entries: ['src/main'],
  outDir: 'dist/main',
  dependencies: ['vue'],
}).catch(() => process.exit(1))

await build('.', false, {
  rollup: {
    inlineDependencies: true,
    esbuild: {
      minify: true,
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  },
  entries: ['context/iframe'],
  outDir: 'dist/iframe',
  dependencies: ['vue'],
}).catch(() => process.exit(1))

await build('.', false, {
  rollup: {
    inlineDependencies: true,
    esbuild: {
      minify: true,
    },
  },
  entries: ['helpers/index'],
  outDir: 'dist/helpers',
}).catch(() => process.exit(1))
