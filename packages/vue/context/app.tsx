// `h` has to be imported for jsx transform
import { defineComponent, shallowRef, h, ref, Suspense, nextTick } from 'vue'
import { useWsOn } from './composables/useWs'
import StoryRenderer from './components/StoryRenderer'

import type { ShallowRef } from 'vue'
import type { Book, Story } from '../types'

type BookExt = '.js' | '.ts'

export default defineComponent({
  setup() {
    const activeBookName = ref<string | null>(null)
    const activeBookExt = ref<BookExt | null>(null)
    const activeStoryName = ref<string | null>(null)
    const activeBook = ref<Book | null>(null)
    const activeStory = shallowRef({}) as ShallowRef<Story>

    interface StoryData {
      bookName: string
      storyName: string
      ext: BookExt
    }
    async function getBook(bookName: string, ext: BookExt): Promise<{default: Book}> {
      // Add timestamp so that browser sends request back to server instead of loading from cache
      const timestamp = Date.now()
      if (ext === '.js')
        return import(`./stories/${bookName}.stories.js?t=${timestamp}`)
      // if (ext === 'ts')
      return import(`./stories/${bookName}.stories.ts?t=${timestamp}`)
    }
    useWsOn('stato-iframe:select-story', async ({ bookName, storyName, ext }: StoryData) => {
      if (activeBookName.value !== bookName) {
        const { default: book } = await getBook(bookName, ext)
        activeBook.value = book
        activeBookExt.value = ext
        activeBookName.value = bookName
      }
      activeStoryName.value = storyName
      activeStory.value = (activeBook.value as Book).stories[storyName]
    })

    useWsOn('stato-iframe:re-import', async () => {
      if (activeBookName.value === null || activeBookExt.value === null) return
      const { default: book } = await getBook(activeBookName.value, activeBookExt.value)
      activeBook.value = book
      activeStory.value = {} as Story
      nextTick(() => {
        activeStory.value = book.stories[activeStoryName.value as string]
      })
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
