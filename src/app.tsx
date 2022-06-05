// `h` has to be imported for jsx transform
import { defineComponent, h, ref, ShallowRef, shallowRef, watch, type PropType } from 'vue'
import { useHResize } from './composables/useHResize'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import type { Story, StoryReturn } from '../types'
import StoryDisplay from './components/StoryDisplay'

export default defineComponent({
  props: {
    sidebarMap: {
      type: Map as PropType<Map<string, string[]>>,
      required: true,
    },
    storyMap: {
      type: Map as PropType<Map<string, Story>>,
      required: true,
    },
  },
  setup(props) {
    const activeStoryMapKey = ref('')
    const activeStory = shallowRef({}) as ShallowRef<StoryReturn>

    watch(activeStoryMapKey, () => {
      const fn = props.storyMap.get(activeStoryMapKey.value)
      if (typeof fn === 'undefined') {
        const [bookName, storyName] = activeStoryMapKey.value.split('/')
        console.warn(`Story ${storyName} of book ${bookName} is undefined.`)
      }
      else if (typeof fn === 'function') {
        activeStory.value = fn()
      }
      else {
        const [bookName, storyName] = activeStoryMapKey.value.split('/')
        console.warn(`Story ${storyName} of book ${bookName} is not a function.`)
      }
    })
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
                            <button onClick={() => { activeStoryMapKey.value = `${bookName}/${story}` }}>
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

        <main class="workspace">
          <div ref="handler" class="resize-handle" />
          <div class="screen">
            screen
            {/* <StoryDisplay story={ activeStory.value } /> */}
            {/* { h(createStoryComponent(activeStory.value)) } */}
          </div>
        </main>
      </div>
    )
  },
})
