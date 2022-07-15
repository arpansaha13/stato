export function getBookName(fileName: string): string {
  let end = fileName.indexOf('.stories.ts')
  if (end === -1) end = fileName.indexOf('.stories.js')
  if (end === -1) end = fileName.indexOf('.stories.mjs')
  if (end === -1) end = fileName.indexOf('.stories.cjs')
  return fileName.substring(0, end)
}
