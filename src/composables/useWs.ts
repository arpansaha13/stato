// Events sent by server - received on client
type ClientWsOnEvents = 'awast:modules'

// Events sent by client - received on server
type ClientWsSendEvents = 'awast:reqStory'

export function useWsOn(e: ClientWsOnEvents, cb: (data?: any) => void) {
  if (import.meta.hot) {
    import.meta.hot.on(e, cb)
  }
}
export function useWsSend(e: ClientWsSendEvents, payload?: any) {
  if (import.meta.hot) {
    if (typeof payload !== 'undefined') import.meta.hot.send(e, payload)
    else import.meta.hot.send(e)
  }
}
