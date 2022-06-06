import * as Vue from 'vue'
import type { PropType, RenderFunction } from 'vue'
import { compileTemplate } from 'vue/compiler-sfc'
import type { StoryReturn } from '../../types/index'

const { defineComponent, h, shallowRef, watch } = Vue

export default defineComponent({
  name: 'StoryRenderer',
  props: {
    story: {
      type: Object as PropType<StoryReturn>,
      default: {},
    },
  },
  setup(props) {
    const dynamic = shallowRef(defineComponent({}))

    function render() {
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
          // vars = Props
          // Should be accessed in story template as vars.xxx
          const { vars } = props.story.setup
            ? props.story.setup()
            : { vars: null }
          return compiled
        },
      })
    }
    watch(props, render, { immediate: true })
    return () => h(dynamic.value)
  },
})
