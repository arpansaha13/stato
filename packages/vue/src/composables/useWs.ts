// Events sent by main server - received on main client
type MainClientWsOnEvents =
  | 'stato-main:iframe-env'
  | 'stato-main:sidebar'
  | 'stato-main:iframe-connected'

// Events sent by main client - received on main server
type MainClientWsSendEvents = 'stato-main:select-story'

export function useWsOn(e: MainClientWsOnEvents, cb: (data?: any) => void) {
  if (import.meta.hot) {
    import.meta.hot.on(e, cb)
  }
}
export function useWsSend(e: MainClientWsSendEvents, payload?: any) {
  if (import.meta.hot) {
    if (typeof payload !== 'undefined') import.meta.hot.send(e, payload)
    else import.meta.hot.send(e)
  }
}
