import { defineBook } from '@stato/vue'
import Navbar from '../components/Navbar.vue'

const Template = (args) => ({
  components: { Navbar },
  setup() {
    return { ...args }
  },
  template: '<Navbar :user="user" />',
})

export default defineBook({
  stories: {
    LoggedIn: Template({
      user: {
        name: 'Jane Doe',
      },
    }),
    LoggedOut: Template({
      user: null,
    }),
  },
})
