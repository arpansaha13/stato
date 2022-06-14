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
  return glob<CSSStyleSheet>('./dev/*/style-*.css', {
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
function getBookHashMap(
  sources: Record<string, { default: Book }>,
  styles: Record<string, () => Promise<CSSStyleSheet>>
) {
  const fileHashMap = new Map<
    string,
    { source: string; style: string | null }
  >()

  for (const path in sources) {
    const { default: book } = sources[path]

    /** Hash of source file */
    const hash = getFileHash(path)
    fileHashMap.set(book.name, { source: hash, style: null })
  }
  for (const path in styles) {
    const bookName = path.split('/')[2] // Name of folder = book name

    /** Hash of style file */
    const hash = getFileHash(path)
    const temp = fileHashMap.get(bookName) as {
      source: string
      style: string | null
    }
    fileHashMap.set(bookName, { ...temp, style: hash })
  }
  return fileHashMap
}

/**
 * Get latest modified file path out of the given paths.
 * @param paths array of relative file paths
 * @returns the most recently updated file. If the `paths` array is empty, then null will be returned.
 */
export function getUpdatedFile(paths: string[]) {
  if (paths.length === 0) return null

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
  const bookHashMap = getBookHashMap(sources, styles)

  return { sidebarMap, bookHashMap }
}
