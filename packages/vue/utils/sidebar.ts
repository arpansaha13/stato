// Types
import type {
  BookDirMap,
  SidebarAddUpdateData,
  SidebarRemoveData,
} from '../types/devTypes'

/** Initialise the sidebar after connecting */
export function initSidebar(
  data: Record<string, Omit<SidebarAddUpdateData, 'type'>>,
  sidebarMap: BookDirMap
) {
  const initList = Object.values(data)
  for (const update of initList) {
    addUpdateBook({ ...update, type: 'add/update book' }, sidebarMap)
  }
}

export function addUpdateBook(
  data: SidebarAddUpdateData,
  sidebarMap: BookDirMap
) {
  /** Nesting of the dir where the book resides. */
  const nesting = data.path.split('/')
  // Remove first two dirs - 'stato' and 'stories'
  nesting.shift()
  nesting.shift()
  // Remove last item which is the filename
  nesting.pop()

  function updateMap(mapToUpdate: BookDirMap, idx: number) {
    if (idx === nesting.length) {
      mapToUpdate.set(data.fileName, data.storyNames)
      return
    }
    if (!mapToUpdate.has(nesting[idx])) {
      mapToUpdate.set(nesting[idx], new Map())
    }
    updateMap(mapToUpdate.get(nesting[idx]) as BookDirMap, idx + 1)
  }
  updateMap(sidebarMap, 0)
}

export function removeBook(data: SidebarRemoveData, sidebarMap: BookDirMap) {
  /** Nesting of the dir where the book resides. */
  const nesting = data.path.split('/')
  // Remove first two dirs - 'stato' and 'stories'
  nesting.shift()
  nesting.shift()
  // Remove last item which is the filename
  nesting.pop()

  function updateMap(mapToUpdate: BookDirMap, idx: number) {
    if (idx === nesting.length) {
      mapToUpdate.delete(data.fileName)
      return
    }
    if (!mapToUpdate.has(nesting[idx])) {
      mapToUpdate.set(nesting[idx], new Map())
    }
    updateMap(mapToUpdate.get(nesting[idx]) as BookDirMap, idx + 1)

    // Remove map if it is empty
    if ((mapToUpdate.get(nesting[idx]) as BookDirMap).size === 0) {
      mapToUpdate.delete(nesting[idx])
    }
  }
  updateMap(sidebarMap, 0)
}
