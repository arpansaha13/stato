// `h` and `Fragment` have to be imported for jsx transform
import { defineComponent, h, inject, Fragment, shallowRef } from 'vue'
import { sentenceCase } from 'change-case'

// Types
import type { PropType } from 'vue'
import type { BookDirMap } from '../../types/devTypes'
// Components
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import {
  CollectionIcon,
  DocumentIcon,
  FolderIcon,
  FolderOpenIcon
} from '@heroicons/vue/solid'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/outline'
// Utils
import { getBookName } from '../utils/getBookName'
// Injection Keys
import { InjectActiveStoryKey, InjectSelectStoryFn } from '../symbols'

function StoryButtonContent(name: string) {
  return (
    <p class="disclosure-button-content">
      {/* extra margin (icon + icon-margin) for empty space for arrow icons */}
      <DocumentIcon class="disclosure-button-icon story-icon" style={{'margin-left': '1.2rem'}} />
      <span>{ name }</span>
    </p>
  )
}
function BookButtonContent(name: string) {
  return (
    <p class="disclosure-button-content">
      {/* extra margin (icon + icon-margin) for empty space for arrow icons */}
      <CollectionIcon class="disclosure-button-icon book-icon" style={{'margin-left': '1.2rem'}} />
      <span>{ name }</span>
    </p>
  )
}
function BookDirButtonContent(name: string, open: boolean) {
  return (
    <p class="disclosure-button-content">
      {
        open
        ? <ChevronDownIcon class="disclosure-button-icon bookdir-icon" />
        : <ChevronRightIcon class="disclosure-button-icon bookdir-icon" />
      }
      {
        open
        ? <FolderOpenIcon class="disclosure-button-icon bookdir-icon" />
        : <FolderIcon class="disclosure-button-icon bookdir-icon" />
      }
      <span style={{display: 'inline-block'}}>{ name }</span>
    </p>
  )
}

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
                  {
                    // use scoped slot `open`
                    ({ open }: any) => bookDirOrStoryNames instanceof Map
                    ? BookDirButtonContent(fileOrDirName, open)
                    : BookButtonContent(getBookName(fileOrDirName))
                  }
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
                            { StoryButtonContent(sentenceCase(storyName)) }
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
