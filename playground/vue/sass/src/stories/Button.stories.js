import { defineBook } from '@stato/vue'
import Button from '../components/Button.vue'

const Template = (props, slot) => ({
  components: { Button },
  setup() {
    return { props, slot }
  },
  template: '<Button v-bind="props">{{ slot }}</Button>',
})

export default defineBook({
  stories: {
    Primary: Template(
      {
        primary: true,
      },
      'Button'
    ),
    Secondary: Template(null, 'Button'),
    Large: Template(
      {
        size: 'large',
      },
      'Button'
    ),
    Small: Template(
      {
        size: 'small',
      },
      'Button'
    ),
  },
})
