// `h` has to be imported foir jsx transform
import { defineComponent, h } from 'vue'
import { useHResize } from './composables/useHResize'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'

export default defineComponent({
  props: {
    modulesTable: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const style = useHResize(
      'target',
      { ref: 'handler', direction: 'normal' },
      { min: '6rem', initial: '16rem', max: '32rem' }
    )
    // TODO: use eslint

    return () => (
      <div class="container">
        <aside ref="target" class="sidebar" style={ style.value } >
          {
            Object.keys(props.modulesTable).map((mod) =>
              <Disclosure as="ul" key={ mod }>
                <DisclosureButton> { mod } </DisclosureButton>
                <DisclosurePanel>
                  {
                    props.modulesTable[mod].map((story: string) =>
                      <li v-for="story in val" key={ story }>
                        { story }
                      </li>
                    )
                  }
                </DisclosurePanel>
              </Disclosure>
            )
          }
          <div ref="handler" class="resize-handle" />
        </aside>

        <div class="screen">screen</div>
      </div>
    )
  },
})
