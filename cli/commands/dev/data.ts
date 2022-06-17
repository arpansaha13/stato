import { statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

import fg from 'fast-glob'
import maxBy from 'lodash/maxBy'

import { globEager } from './globImport'

import type { Ref } from '@vue/reactivity'
import type { Book } from '../../../types'

const __dirname = dirname(fileURLToPath(import.meta.url))

export type BookHashMap = Map<string, { source: string; style: string | null }>

function getSidebarMap(sources: Record<string, Book>) {
  const sidebarMap = new Map<string, string[]>()

  for (const path in sources) {
    const bookName = path.split('/')[2] // Name of folder = book name
    const book = sources[path]

    if (sidebarMap.has(bookName)) {
      console.warn(
        `Duplicate book name ${bookName}. This will override the previous entry.`
      )
    }
    sidebarMap.set(bookName, Object.keys(book.stories))
  }
  return sidebarMap
}
/**
 * Get the hash of a bundled file from its path.
 * @param path path of the file
 */
function getFileHash(path: string) {
  return path.split('/').pop()?.split('-').pop()?.split('.')[0] as string
}
/**
 * Get latest modified file path out of the given paths.
 * @param paths array of relative file paths
 * @returns the most recently updated file. If the `paths` array is empty, then null will be returned.
 */
function getUpdatedFile(paths: string[]) {
  if (paths.length === 0) return null

  return maxBy(paths, (path: string) => {
    // ctime = creation time
    return statSync(resolve(__dirname, path)).ctime
  }) as string
}

function getBookHashMap(sources: Record<string, Book>, styles: string[]) {
  const bookHashMap: BookHashMap = new Map()

  for (const path in sources) {
    const bookName = path.split('/')[2] // Name of folder = book name

    /** Hash of source file */
    const hash = getFileHash(path)
    bookHashMap.set(bookName, { source: hash, style: null })
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
 * Updates hash of source and .css files of the given book in the bookHashMap and returns the updated hashes
 * @param bookHashMap
 * @param bookName
 * @returns the updated hashes along with bookname
 */
export async function updateBookHashMap(
  bookHashMap: Ref<BookHashMap>,
  bookName: string
) {
  const sourcePaths = await fg(`../dev/${bookName}/source-*.mjs`, {
    cwd: __dirname,
  })
  const stylePaths = await fg(`../dev/${bookName}/style-*.css`, {
    cwd: __dirname,
  })
  /** Hash part of the updated source file */
  const sourceHash = getFileHash(getUpdatedFile(sourcePaths) as string)
  /** Hash part of the updated .css file */
  const styleHash =
    stylePaths.length === 0
      ? null
      : getFileHash(getUpdatedFile(stylePaths) as string)

  bookHashMap.value.set(bookName, { source: sourceHash, style: styleHash })
  return { bookName, sourceHash, styleHash }
}

export async function getData() {
  const sources = await globEager<Book>('./dev/*/source-*.mjs', {
    fg: { cwd: resolve(__dirname, '..') },
    importDefault: true,
  })

  const styles = await fg('./dev/*/style-*.css', {
    cwd: resolve(__dirname, '..'),
  })

  const sidebarMap = getSidebarMap(sources)
  const bookHashMap = getBookHashMap(sources, styles)

  return { sidebarMap, bookHashMap }
}
