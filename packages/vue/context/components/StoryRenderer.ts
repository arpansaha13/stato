import * as Vue from 'vue'
import { compileTemplate } from 'vue/compiler-sfc'
import { useStyleTag } from '@vueuse/core'

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
    importStyle: {
      type: Object as PropType<(() => Promise<{ default: string }>) | null>,
      required: true,
    },
  },
  async setup(props) {
    const dynamic = shallowRef(defineComponent({}))
    const { css } = useStyleTag('', { id: 'stato_styletag' })

    async function render() {
      const components = props.story.components ?? {}

      // Dynamically import bundled styles if there are any
      // Import the css as inline and use them in style tag in head
      // https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
      if (props.importStyle !== null) {
        const { default: styles } = await props.importStyle()
        css.value = styles
      } else {
        css.value = ''
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
      () => ref(props.story),
      async () => {
        await render()
      },
      { immediate: true }
    )
    return () => h(dynamic.value)
  },
})
