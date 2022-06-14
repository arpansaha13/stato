import { statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { globEager, glob } from './globImport'
import { max } from 'underscore'

import type { Book } from '../../../types'

async function getSources() {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  return globEager<{ default: Book }>('./dev/*/source-*.mjs', {
    cwd: resolve(__dirname, '..'),
  })
}
async function getStyles() {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  return glob<CSSStyleSheet>('./dev/*/style.css', {
    cwd: resolve(__dirname, '..'),
  })
}

function getSidebarMap(sources: Record<string, { default: Book }>) {
  const sidebarMap = new Map<string, string[]>()

  for (const path in sources) {
    // Make sidebar map
    const { default: book } = sources[path]
    if (sidebarMap.has(book.name)) {
      console.warn(
        `Duplicate book name ${book.name}. This will override the previous entry.`
      )
    }
    sidebarMap.set(book.name, Object.keys(book.stories))
  }
  return sidebarMap
}
/**
 * Get the hash of a bundled file from its path.
 * @param path path of the file
 */
export function getFileHash(path: string) {
  return path.split('/').pop()?.split('-').pop()?.split('.')[0] as string
}
function getFileHashMap(sources: Record<string, { default: Book }>) {
  const fileHashMap = new Map<string, string>()

  for (const path in sources) {
    const { default: book } = sources[path]

    /** Hash of source file */
    const hash = getFileHash(path)
    fileHashMap.set(book.name, hash)
  }
  return fileHashMap
}
function getStyleMap(styles: Record<string, () => Promise<CSSStyleSheet>>) {
  const styleMap = new Map<string, () => Promise<CSSStyleSheet>>()

  for (const path in styles) {
    const bookStyle = styles[path]

    const key = path.split('/')[2]
    styleMap.set(key, bookStyle)
  }
  return styleMap
}

/**
 * Get latest modified file path out of the given paths.
 * @param paths array of relative file paths
 */
export function getUpdatedSource(paths: string[]) {
  const __dirname = dirname(fileURLToPath(import.meta.url))

  return max(paths, (path: string) => {
    // ctime = creation time
    return statSync(resolve(__dirname, path)).ctime
  }) as string
}

export async function getData() {
  const sources = await getSources()
  const styles = await getStyles()

  const sidebarMap = getSidebarMap(sources)
  const fileHashMap = getFileHashMap(sources)
  const styleMap = getStyleMap(styles)

  return { sidebarMap, fileHashMap, styleMap }
}
