import fg, { Options as FastGlobOptions } from 'fast-glob'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

export async function glob<Module = { [key: string]: any }>(
  glob: string,
  options?: FastGlobOptions
) {
  const cwd = options?.cwd ?? process.cwd()
  const paths = await fg(glob, options)
  const modules: Record<string, () => Promise<Module>> = {}

  for (const path of paths) {
    modules[path] = () => import(pathToFileURL(resolve(cwd, path)).href)
  }
  return modules
}

interface GlobEagerOptions {
  /** Options to use for fast-glob */
  fg?: FastGlobOptions
  /** Import only the default import. */
  importDefault?: boolean
}

export async function globEager<Module = { [key: string]: any }>(
  glob: string,
  options?: GlobEagerOptions
) {
  const cwd = options?.fg?.cwd ?? process.cwd()
  const paths = await fg(glob, options?.fg)
  const modules: Record<string, Module> = {}

  if (options && options.importDefault) {
    for (const path of paths) {
      const { default: module } = await import(
        pathToFileURL(resolve(cwd, path)).href
      )
      modules[path] = module
    }
    return modules
  }
  for (const path of paths) {
    modules[path] = await import(pathToFileURL(resolve(cwd, path)).href)
  }
  return modules
}
