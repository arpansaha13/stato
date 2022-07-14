// `h` and `Fragment` have to be imported for jsx transform
import { defineComponent, h, inject, Fragment, shallowRef } from 'vue'
import { sentenceCase } from 'change-case'

// Types
import type { PropType } from 'vue'
import type { BookDirMap } from '../../types/devTypes'
// Components
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'

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

    const books = shallowRef<JSX.Element[]>([])

    function render() {
      for (const [ bookOrDirName, bookDirOrStoryNames ] of props.bookDirMap) {
        books.value.push(
          <Disclosure as="ul" class="disclosure" key={ bookOrDirName }>
            {
              () => <>
                <DisclosureButton class="disclosure-button">
                  { () => <p>{ bookOrDirName }</p> }
                </DisclosureButton>
                <DisclosurePanel class="disclosure-panel">
                  {
                    () => (
                      bookDirOrStoryNames instanceof Map
                      ? <BookDir nesting={ [...props.nesting, bookOrDirName] } bookDirMap={ bookDirOrStoryNames } />
                      : bookDirOrStoryNames.map((storyName: string) => {
                        let currentStoryKey = `${bookOrDirName}/${storyName}`
                        if (props.nesting.length) currentStoryKey = `${props.nesting.join('/')}/${currentStoryKey}`

                        return <li class={`disclosure-panel-item ${ activeStoryKey.value === currentStoryKey ? 'disclosure-panel-item-active' : '' }`} key={ storyName }>
                          <button onClick={ selectStory(props.nesting, bookOrDirName, storyName) }>
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
