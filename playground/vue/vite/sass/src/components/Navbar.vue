<template>
  <header>
    <div class="wrapper">
      <div>
        <h1>Navbar</h1>
      </div>
      <div>
        <span v-if="user" class="welcome">
          Welcome, <strong> {{ user.name }} </strong>!
        </span>
        <Button v-if="user" size="small" @click="$emit('logout')"
          >Log out</Button
        >
        <Button v-if="!user" size="small" @click="$emit('login')">
          Log in
        </Button>
        <Button
          v-if="!user"
          primary
          size="small"
          @click="$emit('createAccount')"
        >
          Sign up
        </Button>
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Button from './Button.vue'
import '../styles/header.sass'

export default defineComponent({
  name: 'Navbar',
  components: { Button },
  props: {
    user: {
      type: Object,
    },
  },
  emits: ['login', 'logout', 'createAccount'],
})
</script>
