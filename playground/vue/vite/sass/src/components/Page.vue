<template>
  <Navbar
    :user="user"
    @login="onLogin"
    @logout="onLogout"
    @createAccount="onCreateAccount"
  />

  <article>
    <section>
      <h2>Pages</h2>
      <p>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Totam pariatur
        enim repudiandae. Quaerat fugiat numquam veniam vel. Quisquam porro
        facilis quaerat cumque odit fugit, velit esse aliquam vero laborum iure
        culpa quod praesentium sed dolore nobis laboriosam aliquid dolorem ullam
        autem nulla debitis. Repellendus recusandae libero perspiciatis
        similique corporis ipsa?
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Adipisci, nisi:
      </p>
      <ul>
        <li>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Placeat ea
          rem delectus consequuntur ad explicabo dolorum aliquid rerum?
          Voluptas, sed.
        </li>
        <li>
          Lorem, ipsum dolor sit amet consectetur adipisicing elit. Non debitis
          labore quo molestias libero asperiores doloribus accusamus et. Nemo
          recusandae eveniet earum velit tempore vero.
        </li>
      </ul>
      <p>
        <a
          href="https://github.com/arpansaha13/stato#readme"
          target="_blank"
          rel="noopener noreferrer"
          >Stato documentation</a
        >
      </p>
    </section>
  </article>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import Navbar from './Navbar.vue'

import '../styles/page.sass'

export default defineComponent({
  name: 'Page',
  components: { Navbar },
  setup() {
    const user = ref<any>(null)

    return {
      user,
      onLogin() {
        user.value = { name: 'Jane Doe' }
      },
      onLogout() {
        user.value = null
      },
      onCreateAccount() {
        user.value = { name: 'Jane Doe' }
      },
    }
  },
})
</script>
