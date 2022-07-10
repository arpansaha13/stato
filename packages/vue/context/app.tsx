// `h` has to be imported for jsx transform
import { defineComponent, shallowRef, h, ref, Suspense } from 'vue'
import { useWsOn } from './composables/useWs'
import StoryRenderer from './components/StoryRenderer'

import type { ShallowRef } from 'vue'
import type { Book, Story } from '../types'

export default defineComponent({
  setup() {
    const activeBookName = ref<string | null>(null)
    const activeStoryName = ref<string | null>(null)
    const activeBook = ref<Book | null>(null)
    const activeStory = shallowRef({}) as ShallowRef<Story>

    interface StoryData {
      bookName: string
      storyName: string
      ext: 'js' | 'ts'
    }
    async function getBook(bookName: string, ext: 'js' | 'ts'): Promise<{default: Book}> {
      if (ext === 'js')
        return import(`./stories/${bookName}.stories.js`)
      // if (ext === 'ts')
      return import(`./stories/${bookName}.stories.ts`)
    }
    useWsOn('stato-iframe:select-story', async ({ bookName, storyName, ext }: StoryData) => {
      if (activeBookName.value !== bookName) {
        const { default: book } = await getBook(bookName, ext)
        activeBook.value = book
        activeBookName.value = bookName
      }
      activeStoryName.value = storyName
      activeStory.value = (activeBook.value as Book).stories[storyName]
    })

    // useWsOn('stato-iframe:update-book', async ({bookName, ext}: Omit<StoryData, 'storyName'>) => {
    //   if (activeBookName.value === bookName) {
    //     const { default: book } = await await getBook(bookName, ext)
    //     activeBook.value = book
    //     activeStory.value = book.stories[activeStoryName.value as string]
    //   }
    // })

    useWsOn('stato-iframe:book-unlinked', (bookName: string) => {
      // If the book that is going to be unlinked, is active
      if (activeBookName.value === bookName) {
        activeBookName.value = null
        activeStoryName.value = null
        activeStory.value = {} as Story
      }
    })

    return () => (
      <main>
        <Suspense>
          {{
            default: [<StoryRenderer story={activeStory.value} />],
            fallback: [<div></div>],
          }}
        </Suspense>
      </main>
    )
  },
})
