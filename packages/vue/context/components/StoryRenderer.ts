import * as Vue from 'vue'
import { compileTemplate } from 'vue/compiler-sfc'

import type { PropType, RenderFunction } from 'vue'
import type { Story } from '../../types/index'

const { defineComponent, h, ref, shallowRef, watch } = Vue

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

    async function render() {
      const components = props.story.components ?? {}

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
        components,
        setup() {
          const storyProps = props.story.setup ? props.story.setup() : null
          return compiled.bind(this, storyProps)
        },
      })
    }
    watch(
      () => ref(props.story),
      async () => {
        await render()
      },
      { immediate: true }
    )
    return () => h(dynamic.value)
  },
})
