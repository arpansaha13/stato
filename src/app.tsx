// `h` has to be imported for jsx transform
import { defineComponent, h, PropType } from 'vue'
import { useHResize } from './composables/useHResize'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'

export default defineComponent({
  props: {
    modulesTable: {
      type: Map as PropType<Map<string, string[]>>,
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
            (() => {
              const mods = []
              for (const [ modName, storyNames ] of props.modulesTable) {
                mods.push(
                  <Disclosure as="ul" key={ modName }>
                    <DisclosureButton> { modName } </DisclosureButton>
                    <DisclosurePanel>
                      {
                        storyNames.map((story: string) =>
                          <li key={ story }>
                            { story }
                          </li>
                        )
                      }
                    </DisclosurePanel>
                  </Disclosure>
                )
              }
              return mods
            })()
          }
        </aside>

        <main class="workspace">
          <div ref="handler" class="resize-handle" />
          <div class="screen">
            screen
          </div>
        </main>
      </div>
    )
  },
})
