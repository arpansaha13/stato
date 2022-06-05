// Events sent by server - received on client
type WsOnEvents = 'awast:modules'

// Events sent by client - received on server
type WsSendEvents = ''

export function useWsOn(e: WsOnEvents, cb: (data?: any) => void) {
  if (import.meta.hot) {
    import.meta.hot.on(e, cb)
  }
}
export function useWsSend(e: WsSendEvents, payload?: any) {
  if (import.meta.hot) {
    if (typeof payload !== 'undefined') import.meta.hot.send(e, payload)
    else import.meta.hot.send(e)
  }
}
