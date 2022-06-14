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
    const importStyle = ref<(() => Promise<CSSStyleSheet>) | null>(null)

    interface StoryData {
      /** Hash of source file name */
      sourceHash: string
      bookName: string
      storyName: string
      /** Will be the name of book if style.css exists for the particular book, else it will be null. */
      styleHash: string | null
    }
    useWsOn('stato-iframe:select-story', async ({ bookName, sourceHash, storyName, styleHash }: StoryData) => {
      const { default: book } = await import(`../dev/${bookName}/source-${sourceHash}.mjs`)

      stories.value.clear()
      for (const storyName of Object.keys(book.stories)) {
        stories.value.set(storyName, book.stories[storyName])
      }
      activeBookName.value = bookName
      activeStoryName.value = storyName
      activeStory.value = stories.value.get(storyName)

      if (typeof activeStory.value === 'undefined') {
        console.warn(`Story ${storyName} of book ${bookName} is undefined.`)

      }
      importStyle.value = styleHash === null ? null : () => import(`../dev/${bookName}/style-${styleHash}.css`)
    })

    useWsOn('stato-iframe:update-book', async ({bookName, sourceHash, styleHash}: {bookName: string; sourceHash: string; styleHash: string | null}) => {
      if (activeBookName.value === bookName) {
      const { default: book } = await import(`../dev/${bookName}/source-${sourceHash}.mjs`)

        stories.value.clear()
        for (const storyName of Object.keys(book.stories)) {
          stories.value.set(storyName, book.stories[storyName])
        }
        importStyle.value = styleHash === null ? null : () => import(`../dev/${bookName}/style-${styleHash}.css`)
        activeStory.value = stories.value.get(activeStoryName.value as string)

      }
    })

    return () => (
      <main>
        <Suspense>
          {{
            default: [<StoryRenderer story={activeStory.value} importStyle={importStyle.value} />],
            fallback: [<div></div>],
          }}
        </Suspense>
      </main>
    )
  },
})
