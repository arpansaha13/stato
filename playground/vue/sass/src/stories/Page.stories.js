import { defineBook } from '@stato/vue'
import Page from '../components/Page.vue'

const Template = () => ({
  components: { Page },
  template: '<Page />',
})

export default defineBook({
  stories: {
    Page: Template(),
  },
})
