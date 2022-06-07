// `h` has to be imported for jsx transform
import {
  defineComponent,
  shallowRef,
  h,
  type PropType,
  type ShallowRef,
} from 'vue'
import { useWsOn } from './composables/useWs'
import StoryRenderer from './components/StoryRenderer'
import type { Story, StoryReturn } from '../types'

export default defineComponent({
  props: {
    storyMap: {
      type: Map as PropType<Map<string, Story>>,
      required: true,
    },
  },
  setup(props) {
    const activeStory = shallowRef({}) as ShallowRef<StoryReturn>

    useWsOn('awast-iframe:select-story', (activeStoryKey) => {
      const fn = props.storyMap.get(activeStoryKey)
      if (typeof fn === 'undefined') {
        const [book, story] = activeStoryKey.split('/')
        console.warn(`Story ${story} of book ${book} is undefined.`)
      }
      else if (typeof fn === 'function') {
        activeStory.value = fn()
      }
      else {
        const [book, story] = activeStoryKey.split('/')
        console.warn(`Story ${story} of book ${book} is not a function.`)
      }
    })

    return () => (
      <main>
        screen
        <StoryRenderer story={activeStory.value} />
      </main>
    )
  },
})
