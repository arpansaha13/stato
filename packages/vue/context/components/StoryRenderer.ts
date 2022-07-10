import * as Vue from 'vue'
import { compileTemplate } from 'vue/compiler-sfc'

import type { PropType, RenderFunction } from 'vue'
import type { Story } from '../../types/index'

const { defineComponent, h, shallowRef, toRaw, toRef, watch } = Vue

export default defineComponent({
  name: 'StoryRenderer',
  props: {
    story: {
      type: Object as PropType<Story>,
      default: {},
    },
  },
  async setup(props) {
    const dynamic = shallowRef(defineComponent({}))

    function render() {
      // `vite-plugin-vue` will add a footer that contains `__VUE_HMR_RUNTIME__` in every component
      // use toRaw() to get the original component object
      const components = props.story.components
        ? toRaw(props.story.components)
        : {}

      const compiled: RenderFunction = new Function(
        'Vue',
        compileTemplate({
          source: props.story.template ?? '<div></div>',
          compilerOptions: { mode: 'function' },
          id: 'story',
          filename: 'anonymous.vue',
        }).code
      )(Vue)

      dynamic.value = defineComponent({
        name: 'Story',
        components,
        setup() {
          const storyProps = props.story.setup ? props.story.setup() : null
          return compiled.bind(this, storyProps)
        },
      })
    }
    const story = toRef(props, 'story')
    watch(story, render, { immediate: true })
    return () => h(dynamic.value)
  },
})
