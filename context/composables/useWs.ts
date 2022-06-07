// Events sent by iframe server - received on iframe client
type IframeClientWsOnEvents = 'awast-iframe:select-story'

// Events sent by iframe client - received on iframe server
type IframeClientWsSendEvents = ''

export function useWsOn(e: IframeClientWsOnEvents, cb: (data?: any) => void) {
  if (import.meta.hot) {
    import.meta.hot.on(e, cb)
  }
}
export function useWsSend(e: IframeClientWsSendEvents, payload?: any) {
  if (import.meta.hot) {
    if (typeof payload !== 'undefined') import.meta.hot.send(e, payload)
    else import.meta.hot.send(e)
  }
}
