// `h` has to be imported for jsx transform
import { defineComponent, h, ref, type PropType } from 'vue'
import { useHResize } from './composables/useHResize'
import { useWsOn, useWsSend } from './composables/useWs'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
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
    // TODO: use eslint

    return () => (
      <div class="container">
        <aside ref="target" class="sidebar" style={ style.value } >
          {
            (() => {
              const books = []
              for (const [ bookName, storyNames ] of props.sidebarMap) {
                books.push(
                  <Disclosure as="ul" key={ bookName }>
                    <DisclosureButton> { bookName } </DisclosureButton>
                    <DisclosurePanel>
                      {
                        storyNames.map((story: string) =>
                          <li key={ story }>
                            <button onClick={ selectStory(bookName, story) }>
                              { story }
                            </button>
                          </li>
                        )
                      }
                    </DisclosurePanel>
                  </Disclosure>
                )
              }
              return books
            })()
          }
        </aside>
        {
          iframeURL.value !== null &&
          <main class="workspace">
            <div ref="handler" class="resize-handle" />
            <div class="screen">
              <iframe src={ iframeURL.value } id="awast-iframe" title="Awast iframe for rendering stories in isolation" />
            </div>
          </main>
        }
      </div>
    )
  },
})
