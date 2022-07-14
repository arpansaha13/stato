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
    const activePath = ref<string | null>(null)

    interface StoryData {
      nesting: string[],
      bookName: string
      storyName: string
      ext: BookExt
    }
    async function getBook(): Promise<{default: Book}> {
      // Add timestamp so that browser sends request back to server instead of loading from cache
      const timestamp = Date.now()
      let segment = activeBookName.value
      if (activePath.value) segment = `${activePath.value}/${segment}`

      if (activeBookExt.value === '.js')
        return import(`./stories/${segment}.stories.js?t=${timestamp}`)
      // if (activeBookExt.value === 'ts')
      return import(`./stories/${segment}.stories.ts?t=${timestamp}`)
    }
    useWsOn('stato-iframe:select-story', async ({ nesting, bookName, storyName, ext }: StoryData) => {
      const path = nesting.join('/')
      if (activePath.value !== path || activeBookName.value !== bookName) {
        activePath.value = path
        activeBookExt.value = ext
        activeBookName.value = bookName
        const { default: book } = await getBook()
        activeBook.value = book
      }
      activeStoryName.value = storyName
      activeStory.value = (activeBook.value as Book).stories[storyName]
    })

    useWsOn('stato-iframe:re-import', async () => {
      if (activeBookName.value === null) return
      const { default: book } = await getBook()
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
