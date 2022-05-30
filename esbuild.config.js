import { build } from 'esbuild'

build({
  entryPoints: ['src/styles/index.css'],
  outdir: 'dist/assets',
  bundle: true,
  minify: true,
}).catch(() => process.exit(1))
