// `h` has to be imported for jsx transform
import { defineComponent, shallowRef, h, ref, Suspense } from 'vue'
import { useWsOn } from './composables/useWs'
import StoryRenderer from './components/StoryRenderer'

import type { PropType, ShallowRef } from 'vue'
import type { Story, StoryReturn } from '../types'

export default defineComponent({
  props: {
    storyMap: {
      type: Map as PropType<Map<string, Story>>,
      required: true,
    },
    bookStyleMap: {
      type: Map as PropType<Map<string, () => Promise<CSSStyleSheet>>>,
      required: true,
    },
  },
  setup(props) {
    const activeStory = shallowRef({}) as ShallowRef<StoryReturn>

    // Dynamically import bundled styles if there are any
    const importBookStyle = ref<(() => Promise<{ [key: string]: any }>) | null>(null)

    useWsOn('stato-iframe:select-story', (activeStoryKey: string) => {
      const fn = props.storyMap.get(activeStoryKey)
      const [book, story] = activeStoryKey.split('/')

      if (props.bookStyleMap.has(book)) {
        importBookStyle.value = props.bookStyleMap.get(book) as () => Promise<{ [key: string]: any }>
      } else {
        importBookStyle.value = null
      }

      if (typeof fn === 'function') {
        activeStory.value = fn()
      }
      else if (typeof fn === 'undefined') {
        console.warn(`Story ${story} of book ${book} is undefined.`)
      }
      else {
        console.warn(`Story ${story} of book ${book} is not a function.`)
      }
    })

    return () => (
      <main>
        <Suspense>
          {{
            default: [<StoryRenderer story={activeStory.value} importBookStyle={importBookStyle.value} />],
            fallback: [<div></div>],
          }}
        </Suspense>
      </main>
    )
  },
})
