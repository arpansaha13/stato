// `h` and `Fragment` have to be imported for jsx transform
import { defineComponent, h, inject, Fragment, shallowRef } from 'vue'
import { sentenceCase } from 'change-case'

// Types
import type { PropType } from 'vue'
import type { BookDirMap } from '../../types/devTypes'
// Components
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
// Utils
import { getBookName } from '../../utils/getBookName'
// Injection Keys
import { InjectActiveStoryKey, InjectSelectStoryFn } from '../symbols'

const BookDir = defineComponent({
  name: 'BookDir',
  props: {
    /** Nesting of the dir. */
    nesting: {
      type: Array as PropType<string[]>,
      required: true,
    },
    /** The map or dir to be rendered */
    bookDirMap: {
      type: Map as PropType<BookDirMap>,
      required: true,
    },
  },
  setup(props) {
    const activeStoryKey = inject(InjectActiveStoryKey)!
    const selectStory = inject(InjectSelectStoryFn)!

    function render() {
      const books = shallowRef<JSX.Element[]>([])

      for (const [ fileOrDirName, bookDirOrStoryNames ] of props.bookDirMap) {
        books.value.push(
          <Disclosure as="ul" class="disclosure" key={ fileOrDirName }>
            {
              () => <>
                <DisclosureButton class="disclosure-button">
                  { () => <p>{ bookDirOrStoryNames instanceof Map ? fileOrDirName : getBookName(fileOrDirName) }</p> }
                </DisclosureButton>
                <DisclosurePanel class="disclosure-panel">
                  {
                    () => (
                      bookDirOrStoryNames instanceof Map
                      ? <BookDir nesting={ [...props.nesting, fileOrDirName] } bookDirMap={ bookDirOrStoryNames } />
                      : bookDirOrStoryNames.map((storyName: string) => {
                        let currentStoryKey = `${fileOrDirName}/${storyName}`
                        if (props.nesting.length) currentStoryKey = `${props.nesting.join('/')}/${currentStoryKey}`

                        return <li class={`disclosure-panel-item ${ activeStoryKey.value === currentStoryKey ? 'disclosure-panel-item-active' : '' }`} key={ storyName }>
                          <button onClick={ selectStory(props.nesting, fileOrDirName, storyName) }>
                            { sentenceCase(storyName) }
                          </button>
                        </li>
                      })
                    )
                  }
                </DisclosurePanel>
              </>
            }
          </Disclosure>
        )
      }
      return books.value
    }
    return render
  }
})

export default BookDir
