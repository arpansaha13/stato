// `h` has to be imported for jsx transform
import { defineComponent, shallowRef, h, ref, Suspense, nextTick } from 'vue'
import { useWsOn } from './composables/useWs'
import StoryRenderer from './components/StoryRenderer'

import type { ShallowRef } from 'vue'
import type { Book, Story } from '../types'

type BookExt = '.js' | '.ts'

export default defineComponent({
  setup() {
    const activeFileName = ref<string | null>(null)
    const activeStoryName = ref<string | null>(null)
    const activeBook = ref<Book | null>(null)
    const activeStory = shallowRef({}) as ShallowRef<Story>
    const activePath = ref<string | null>(null)

    interface StoryData {
      nesting: string[],
      fileName: string
      storyName: string
    }
    async function getBook(): Promise<{default: Book}> {
      // Add timestamp so that browser sends request back to server instead of loading from cache
      const timestamp = Date.now()
      let segment = activeFileName.value
      if (activePath.value) segment = `${activePath.value}/${segment}`

      // Remove the file ext from the segment
      const temp = segment!.split('.')
      const ext = temp.pop() as ('js' | 'ts')
      segment = temp.join('.')

      if (ext === 'js')
        return import(`./stories/${segment}.js?t=${timestamp}`)
      // if (ext === 'ts')
      return import(`./stories/${segment}.stories.ts?t=${timestamp}`)
    }
    useWsOn('stato-iframe:select-story', async ({ nesting, fileName, storyName }: StoryData) => {
      const path = nesting.join('/')
      if (activePath.value !== path || activeFileName.value !== fileName) {
        activePath.value = path
        activeFileName.value = fileName
        const { default: book } = await getBook()
        activeBook.value = book
      }
      activeStoryName.value = storyName
      activeStory.value = (activeBook.value as Book).stories[storyName]
    })

    useWsOn('stato-iframe:re-import', async () => {
      if (activeFileName.value === null) return
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
