// Types here are not meant to be included in the package

export interface SidebarAddUpdateData {
  type: 'add/update book'
  /** path to book relative to root */
  path: string
  fileName: string
  storyNames: string[]
}
export interface SidebarRemoveData {
  type: 'remove book'
  /** path to book relative to root */
  path: string
  fileName: string
}
export interface InitSidebarData {
  type: 'init sidebar'
  data: Record<string, Omit<SidebarAddUpdateData, 'type'>>
}

export interface IframeEnv {
  IFRAME_SERVER_HOST: string
  IFRAME_SERVER_PORT: number
}

// For main app only
export type BookDirMap = Map<string, BookDirMap | string[]>
