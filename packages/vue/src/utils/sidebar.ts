// Types
import type {
  BookDirMap,
  SidebarAddUpdateData,
  SidebarRemoveData,
} from '../../types/devTypes'

/** Initialise the sidebar after connecting */
export function initSidebar(
  data: Record<string, Omit<SidebarAddUpdateData, 'type'>>,
  sidebarMap: BookDirMap
) {
  const initList = Object.values(data)
  for (const update of initList) {
    /** Nesting of the dir where the book resides. */
    const nesting = update.path.split('/')
    // Remove first two dirs - 'stato' and 'stories'
    nesting.shift()
    nesting.shift()
    // Remove last item which is the filename
    nesting.pop()

    function updateMap(mapToUpdate: BookDirMap, idx: number) {
      if (idx === nesting.length) {
        mapToUpdate.set(update.bookName, update.storyNames)
        return
      }
      if (!mapToUpdate.has(nesting[idx])) {
        mapToUpdate.set(nesting[idx], new Map())
      }
      updateMap(mapToUpdate.get(nesting[idx]) as BookDirMap, idx + 1)
    }
    updateMap(sidebarMap, 0)
  }
}

export function addUpdateBook(
  data: SidebarAddUpdateData,
  sidebarMap: BookDirMap
) {
  console.log('add update')
}

export function removeBook(data: SidebarRemoveData, sidebarMap: BookDirMap) {
  console.log('remove')
}
