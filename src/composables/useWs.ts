// Events sent by main server - received on main client
type MainClientWsOnEvents = 'awast-main:iframe-env'

// Events sent by main client - received on main server
type MainClientWsSendEvents = 'awast-main:select-story'

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
