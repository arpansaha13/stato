import { defineComponent, h } from 'vue'
import { useHResize } from './composables/useHResize'

export default defineComponent({
  setup() {
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
