// `h` and `Fragment` have to be imported for jsx transform
import { defineComponent, h, ref, Fragment } from 'vue'
import { useHResize } from './composables/useHResize'
import { useWsOn, useWsSend } from './composables/useWs'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { sentenceCase } from 'change-case'

import type { PropType } from 'vue'
import type { IframeEnv } from '../types'

export default defineComponent({
  props: {
    sidebarMap: {
      type: Map as PropType<Map<string, string[]>>,
      required: true,
    },
  },
  setup(props) {
    const activeStoryMapKey = ref('')
    const iframeURL = ref<string | null>(null)

    useWsOn('awast-main:iframe-env', (iframeEnv: IframeEnv) => {
      iframeURL.value = `http://${iframeEnv.IFRAME_SERVER_HOST}:${iframeEnv.IFRAME_SERVER_PORT}`
    })

    function selectStory(book: string, story: string) {
      return () => {
        activeStoryMapKey.value = `${book}/${story}`
        useWsSend('awast-main:select-story', `${book}/${story}`)
      }
    }

    const style = useHResize(
      'target',
      { ref: 'handler', direction: 'normal' },
      { min: '6rem', initial: '16rem', max: '32rem' }
    )

    return () => (
      <div class="container">
        <aside ref="target" class="sidebar" style={ style.value } >
          {
            (() => {
              const books = []
              for (const [ bookName, storyNames ] of props.sidebarMap) {
                books.push(
                  <Disclosure as="ul" class="disclosure" key={ bookName }>
                    {
                      (() => <>
                        { h(DisclosureButton, null, () => h('span', null, bookName)) }
                        {/* <DisclosureButton class="disclosure-button"> { () => [<>{ bookName }</>] } </DisclosureButton> */}
                        <DisclosurePanel class="disclosure-panel">
                          {
                            () => storyNames.map((story: string) =>
                              <li class={`disclosure-panel-item ${ activeStoryMapKey.value === bookName + '/' + story ? 'disclosure-panel-item-active' : '' }`} key={ story }>
                                <button onClick={ selectStory(bookName, story) }>
                                  { sentenceCase(story) }
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
              <iframe src={ iframeURL.value } id="awast-iframe" title="Awast iframe for rendering stories in isolation" />
            </div>
          }
        </main>
      </div>
    )
  },
})
