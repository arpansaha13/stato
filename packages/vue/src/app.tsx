// `h` has to be imported for jsx transform
import { defineComponent, h, ref, provide, reactive } from 'vue'

// Types
import type { BookDirMap, IframeEnv, InitSidebarData, SidebarAddUpdateData, SidebarRemoveData } from '../types/devTypes'
// Components
import Sidebar from './components/BookDir'
// Composables and Utils
import { useHResize } from './composables/useHResize'
import { useWsOn, useWsSend } from './composables/useWs'
import { addUpdateBook, initSidebar, removeBook } from '../utils/sidebar'
// Injection keys
import { InjectActiveStoryKey, InjectSelectStoryFn } from './symbols'

export default defineComponent({
  setup() {
    const activeStoryKey = ref('')
    const sidebarMap = reactive<BookDirMap>(new Map())
    const iframeURL = ref<string | null>(null)
    const iframeConnected = ref(false)

    useWsOn('stato-main:iframe-env', (iframeEnv: IframeEnv) => {
      iframeURL.value = `http://${iframeEnv.IFRAME_SERVER_HOST}:${iframeEnv.IFRAME_SERVER_PORT}`
    })
    useWsOn('stato-main:sidebar', (data: InitSidebarData | SidebarAddUpdateData | SidebarRemoveData) => {
      switch (data.type) {
        case 'init sidebar':
          initSidebar(data.data, sidebarMap)
          break
        case 'add/update book':
          addUpdateBook(data, sidebarMap)
          break
        case 'remove book':
          removeBook(data, sidebarMap)
          break
        default:
          console.warn('Invalid sidebar update type')
      }
    })

    useWsOn('stato-main:iframe-connected', () => {
      iframeConnected.value = true
    })

    function selectStory(nesting: string[], fileName: string, storyName: string) {
      return () => {
        let newKey = `${fileName}/${storyName}`
        if (nesting.length) newKey = `${nesting.join('/')}/${newKey}`
        if (activeStoryKey.value !== newKey) {
          activeStoryKey.value = newKey
          useWsSend('stato-main:select-story', { nesting, fileName, storyName })
        }
      }
    }

    provide(InjectActiveStoryKey, activeStoryKey)
    provide(InjectSelectStoryFn, selectStory)

    const style = useHResize(
      'target',
      { ref: 'handler', direction: 'normal' },
      { min: '6rem', initial: '16rem', max: '32rem' }
    )

    return () => (
      <div class="container">
        <aside ref="target" class="sidebar" style={ style.value }>
          {
            // Render sidebar after iframe client is connected
            iframeConnected.value ? <Sidebar nesting={ [] } bookDirMap={ sidebarMap } /> : null
          }
        </aside>
        <main class="workspace">
          <div ref="handler" class="resize-handle" />
          {
            iframeURL.value !== null &&
            <div class="screen">
              <iframe src={ iframeURL.value } id="stato-iframe" title="Stato iframe for rendering stories in isolation" />
            </div>
          }
        </main>
      </div>
    )
  },
})
