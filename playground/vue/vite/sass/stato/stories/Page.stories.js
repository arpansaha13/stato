import { defineBook } from '@stato/vue'
import Page from '../../src/components/Page.vue'

const Template = () => ({
  components: { Page },
  template: '<Page />',
})

export default defineBook({
  stories: {
    Page: Template(),
  },
})
