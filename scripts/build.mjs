import { build as unbuild } from 'unbuild'
import { build as esbuild } from 'esbuild'

// CLI - esm
await unbuild('.', false, {
  rollup: {
    inlineDependencies: true,
    esbuild: {
      minify: true,
    },
  },
  entries: ['cli/index'],
  outDir: 'dist/cli',
  dependencies: ['vue', 'vite', '@vitejs/plugin-vue'],
  externals: [
    'node:fs',
    'node:url',
    'node:buffer',
    'node:child_process',
    'node:process',
    'node:path',
  ],
}).catch((err) => {
  console.error(err)
  process.exit(1)
})

// Main app - esm
await unbuild('.', false, {
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
}).catch((err) => {
  console.error(err)
  process.exit(1)
})

// Context/iframe app - esm
await unbuild('.', false, {
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
}).catch((err) => {
  console.error(err)
  process.exit(1)
})

// Helpers - esm and cjs
const formats = [
  { format: 'esm', ext: 'mjs' },
  { format: 'cjs', ext: 'cjs' },
]
for (const { format, ext } of formats) {
  await esbuild({
    entryPoints: ['helpers/index.ts'],
    outfile: `dist/helpers/index.${ext}`,
    bundle: true,
    minify: true,
    external: ['vue'],
    platform: 'node',
    format,
  }).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

// CSS
await esbuild({
  entryPoints: ['src/styles/index.css'],
  outdir: 'dist/main',
  bundle: true,
  minify: true,
}).catch((err) => {
  console.error(err)
  process.exit(1)
})
