// `h` has to be imported for jsx transform
import { defineComponent, shallowRef, h, ref, Suspense } from 'vue'
import { useWsOn, useWsSend } from './composables/useWs'
import StoryRenderer from './components/StoryRenderer'

import type { ShallowRef } from 'vue'
import type { Book, Story } from '../types'

export default defineComponent({
  setup() {
    const activeBookName = ref<string | null>(null)
    const activeStoryName = ref<string | null>(null)
    const activeBook = ref<Book | null>(null)
    const activeStory = shallowRef({}) as ShallowRef<Story>
    const importStyle = ref<(() => Promise<{ default: string }>) | null>(null)

    interface StoryData {
      bookName: string
      storyName: string
      /** Hash of source file name */
      sourceHash: string
      /** Will be the hash of the style file if style.css exists for the particular book, else it will be `null`. */
      styleHash: string | null
    }
    useWsOn('stato-iframe:select-story', async ({ bookName, sourceHash, storyName, styleHash }: StoryData) => {
      if (activeBookName.value !== bookName) {
        const { default: book } = await import(`../dev/${bookName}/source-${sourceHash}.mjs`)
        activeBook.value = book
        activeBookName.value = bookName
      }
      activeStoryName.value = storyName
      activeStory.value = (activeBook.value as Book).stories[storyName]
      importStyle.value = styleHash === null ? null : (() => import(`../dev/${bookName}/style-${styleHash}.css?inline`))
    })

    useWsOn('stato-iframe:update-book', async ({bookName, sourceHash, styleHash}: {bookName: string; sourceHash: string; styleHash: string | null}) => {
      if (activeBookName.value === bookName) {
        const { default: book } = await import(`../dev/${bookName}/source-${sourceHash}.mjs`)
        activeBook.value = book
        activeStory.value = book.stories[activeStoryName.value as string]
        importStyle.value = styleHash === null ? null : () => import(`../dev/${bookName}/style-${styleHash}.css?inline`)
      }
    })

    useWsOn('stato-iframe:book-unlinked', (bookName: string) => {
      // If the book that is going to be unlinked, is active
      if (activeBookName.value === bookName) {
        activeBookName.value = null
        activeStoryName.value = null
        activeStory.value = {} as Story
        importStyle.value = null
      }
      useWsSend('stato-iframe:remove-bundle')
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
