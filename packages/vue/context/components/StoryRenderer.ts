import * as Vue from 'vue'
import { compileTemplate } from 'vue/compiler-sfc'

import type { PropType, RenderFunction } from 'vue'
import type { Story } from '../../types/index'

const { defineComponent, h, shallowRef, watch } = Vue

export default defineComponent({
  name: 'StoryRenderer',
  props: {
    story: {
      type: Object as PropType<Story>,
      default: {},
    },
    importStyle: {
      type: Object as PropType<(() => Promise<CSSStyleSheet>) | null>,
      required: true,
    },
  },
  async setup(props) {
    const dynamic = shallowRef(defineComponent({}))

    async function render() {
      const components = props.story.components ?? {}

      // Dynamically import bundled styles if there are any
      // https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
      if (props.importStyle !== null) {
        await props.importStyle()
      }

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
      props,
      async () => {
        await render()
      },
      { immediate: true }
    )
    return () => h(dynamic.value)
  },
})
