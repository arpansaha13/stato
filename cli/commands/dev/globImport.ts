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

export async function globEager<Module = { [key: string]: any }>(
  glob: string,
  options?: FastGlobOptions
) {
  const cwd = options?.cwd ?? process.cwd()
  const paths = await fg(glob, options)
  const modules: Record<string, Module> = {}

  for (const path of paths) {
    modules[path] = await import(pathToFileURL(resolve(cwd, path)).href)
  }
  return modules
}
