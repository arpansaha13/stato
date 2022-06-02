import { defineComponent, h, shallowRef, type ShallowRef } from 'vue'
import { useHResize } from './composables/useHResize'

export default defineComponent({
  setup() {
    const storyPaths: ShallowRef<string[]> = shallowRef([])

    if (import.meta.hot) {
      import.meta.hot.on('awast:storyPaths', (data: string[]) => {
        storyPaths.value = data
      })
    } else {
      console.warn('No event received from server')
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
