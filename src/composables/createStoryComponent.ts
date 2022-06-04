import { compile, defineComponent } from 'vue'
import type { StoryReturn } from '../../types'

export function createStoryComponent(story: StoryReturn) {
  return defineComponent({
    components: story.components,
    setup() {
      const { vars } = story.setup?.()
      return compile(story.template)
    },
  })
}

// export function createStoryComponent(story: StoryReturn) {
//   return defineComponent({
//     components: story.components,
//     setup() {
//       const { vars } = story.setup?.()
//       return () => story.jsxtemplate
//     },
//   })
// }
