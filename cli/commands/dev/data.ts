import fg from 'fast-glob'
import { statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { globEager } from './globImport'
import maxBy from 'lodash/maxBy'

import type { Book } from '../../../types'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function getSources() {
  return globEager<Book>('./dev/*/source-*.mjs', {
    fg: { cwd: resolve(__dirname, '..') },
    importDefault: true,
  })
}

function getSidebarMap(sources: Record<string, Book>) {
  const sidebarMap = new Map<string, string[]>()

  for (const path in sources) {
    // Make sidebar map
    const book = sources[path]
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
function getBookHashMap(sources: Record<string, Book>, styles: string[]) {
  const bookHashMap = new Map<
    string,
    { source: string; style: string | null }
  >()

  for (const path in sources) {
    const book = sources[path]

    /** Hash of source file */
    const hash = getFileHash(path)
    bookHashMap.set(book.name, { source: hash, style: null })
  }
  for (const path of styles) {
    const bookName = path.split('/')[2] // Name of folder = book name

    /** Hash of style file */
    const hash = getFileHash(path)
    const temp = bookHashMap.get(bookName) as {
      source: string
      style: string | null
    }
    bookHashMap.set(bookName, { ...temp, style: hash })
  }
  return bookHashMap
}

/**
 * Get latest modified file path out of the given paths.
 * @param paths array of relative file paths
 * @returns the most recently updated file. If the `paths` array is empty, then null will be returned.
 */
export function getUpdatedFile(paths: string[]) {
  if (paths.length === 0) return null

  return maxBy(paths, (path: string) => {
    // ctime = creation time
    return statSync(resolve(__dirname, path)).ctime
  }) as string
}

export async function getData() {
  const sources = await getSources()
  const styles = await fg('./dev/*/style-*.css', {
    cwd: resolve(__dirname, '..'),
  })

  const sidebarMap = getSidebarMap(sources)
  const bookHashMap = getBookHashMap(sources, styles)

  return { sidebarMap, bookHashMap }
}
