// `h` has to be imported for jsx transform
import { defineComponent, shallowRef, h, ref, Suspense } from 'vue'
import { useWsOn } from './composables/useWs'
import StoryRenderer from './components/StoryRenderer'

import type { ShallowRef } from 'vue'
import type { Story } from '../types'

export default defineComponent({
  setup() {
    /** All stories of the particular book */
    const stories = shallowRef(new Map<string, Story>())
    /** Selected story */
    const activeBookName = ref<string | null>(null)
    const activeStoryName = ref<string | null>(null)
    const activeStory = shallowRef({}) as ShallowRef<Story | undefined>
    const stylePathSegment = ref<string | null>(null)

    interface StoryData {
      /** Hash of source file name */
      sourceHash: string
      bookName: string
      storyName: string
      /** Will be the name of book if style.css exists for the particular book, else it will be null. */
      stylePathSegment: string | null
    }
    useWsOn('stato-iframe:select-story', async (storyData: StoryData) => {
      const { default: book } = await import(`../dev/${storyData.bookName}/source-${storyData.sourceHash}.mjs`)

      stories.value.clear()
      for (const storyName of Object.keys(book.stories)) {
        stories.value.set(storyName, book.stories[storyName])
      }
      activeBookName.value = storyData.bookName
      activeStoryName.value = storyData.storyName
      activeStory.value = stories.value.get(storyData.storyName)

      if (typeof activeStory.value === 'undefined') {
        console.warn(`Story ${storyData.storyName} of book ${storyData.bookName} is undefined.`)
      }
      stylePathSegment.value = storyData.stylePathSegment
    })

    useWsOn('stato-iframe:update-book', async ({bookName, sourceHash}: {bookName: string; sourceHash: string}) => {
      if (activeBookName.value === bookName) {
      const { default: book } = await import(`../dev/${bookName}/source-${sourceHash}.mjs`)

        stories.value.clear()
        for (const storyName of Object.keys(book.stories)) {
          stories.value.set(storyName, book.stories[storyName])
        }
        activeStory.value = stories.value.get(activeStoryName.value as string)
      }
    })

    return () => (
      <main>
        <Suspense>
          {{
            default: [<StoryRenderer story={activeStory.value} stylePathSegment={stylePathSegment.value} />],
            fallback: [<div></div>],
          }}
        </Suspense>
      </main>
    )
  },
})
