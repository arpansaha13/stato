// `h` and `Fragment` have to be imported for jsx transform
import { defineComponent, h, ref, Fragment, shallowRef } from 'vue'
import { useHResize } from './composables/useHResize'
import { useWsOn, useWsSend } from './composables/useWs'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { sentenceCase } from 'change-case'

import type { IframeEnv } from '../types'

export default defineComponent({
  setup() {
    const activeStoryMapKey = ref('')
    const sidebarMap = shallowRef(new Map<string, string[]>())
    const iframeURL = ref<string | null>(null)

    useWsOn('stato-main:iframe-env', (iframeEnv: IframeEnv) => {
      iframeURL.value = `http://${iframeEnv.IFRAME_SERVER_HOST}:${iframeEnv.IFRAME_SERVER_PORT}`
    })

    useWsOn('stato-main:sidebar-map', (data: Map<string, string[]>) => {
      sidebarMap.value = new Map(data)
    })

    function selectStory(bookName: string, storyName: string) {
      return () => {
        const newKey = `${bookName}/${storyName}`
        if (activeStoryMapKey.value !== newKey) {
          activeStoryMapKey.value = newKey
          useWsSend('stato-main:select-story', { bookName, storyName })
        }
      }
    }

    const style = useHResize(
      'target',
      { ref: 'handler', direction: 'normal' },
      { min: '6rem', initial: '16rem', max: '32rem' }
    )

    return () => (
      <div class="container">
        <aside ref="target" class="sidebar" style={ style.value }>
          {
            (() => {
              const books = []
              for (const [ bookName, storyNames ] of sidebarMap.value) {
                books.push(
                  <Disclosure as="ul" class="disclosure" key={ bookName }>
                    {
                      (() => <>
                        { h(DisclosureButton, null, () => h('span', null, bookName)) }
                        <DisclosurePanel class="disclosure-panel">
                          {
                            () => storyNames.map((storyName: string) =>
                              <li class={`disclosure-panel-item ${ activeStoryMapKey.value === bookName + '/' + storyName ? 'disclosure-panel-item-active' : '' }`} key={ storyName }>
                                <button onClick={ selectStory(bookName, storyName) }>
                                  { sentenceCase(storyName) }
                                </button>
                              </li>
                            )
                          }
                        </DisclosurePanel>
                      </>)
                    }
                  </Disclosure>
                )
              }
              return books
            })()
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
