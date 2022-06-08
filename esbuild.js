import { build } from 'esbuild'

build({
  entryPoints: ['src/styles/index.css'],
  outdir: 'dist/main',
  bundle: true,
  minify: true,
}).catch(() => process.exit(1))
