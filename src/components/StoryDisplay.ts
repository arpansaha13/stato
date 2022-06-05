import { defineComponent, h, ref, watch, type PropType } from 'vue'
import { compileTemplate, parse } from 'vue/compiler-sfc'
import type { StoryReturn } from '../../types/index'

export default defineComponent({
  props: {
    story: {
      type: Object as PropType<StoryReturn>,
      default: () => ({}),
    },
  },
  setup(props) {
    const parsed = ref(parse(props.story.template ?? '<div></div>'))
    const compiled = ref(
      compileTemplate({ id: 'story', ...parsed.value.descriptor })
    )
    // const vars = ref(props.story.setup ? props.story.setup() : null)

    // const dynamic = shallowRef(
    //   defineComponent({
    //     components: props.story.components ?? {},
    //     setup() {
    //       return compiled.value
    //     },
    //   })
    // )
    function render() {
      parsed.value = parse(props.story.template ?? '<div></div>')
      compiled.value = compileTemplate({
        id: 'story',
        ...parsed.value.descriptor,
      })
      // compiled.value = compile(props.story.template ?? '<div></div>')
      //   vars.value = props.story.setup ? props.story.setup() : null

      //   dynamic.value = defineComponent({
      //     components: props.story.components ?? {},
      //     setup() {
      //       return compiled.value
      //     },
      //   })
      //   console.log(props.story)
      console.log(parsed.value)
      console.log(compiled.value)
      //   console.log(dynamic.value)
      //   console.log(vars.value)
    }
    watch(props, render)
    return () => h('div')
    // return () => h(dynamic.value, vars.value)
  },
})
