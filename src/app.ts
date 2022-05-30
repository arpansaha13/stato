import { defineComponent, h } from 'vue'
import { useHResize } from './composables/useHResize'

console.log(import.meta)

export default defineComponent({
  setup() {
    if ((import.meta as any).hot) {
      ;(import.meta as any).hot.on(
        'awast:storyPaths',
        (storyPaths: string[]) => {
          console.log(storyPaths)
        }
      )
    }
    const style = useHResize(
      'target',
      { ref: 'handler', direction: 'normal' },
      { min: '6rem', initial: '16rem', max: '32rem' }
    )

    return () =>
      h('div', { class: 'container' }, [
        h('aside', { ref: 'target', class: 'sidebar', style: style.value }, [
          h('div', { ref: 'handler', class: 'resize-handle' }),
        ]),
        h('div', { class: 'screen' }, 'screen slot'),
      ])
  },
})
