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

<style scoped>
.wrapper {
  @apply flex items-center justify-between;
  font-family: 'Nunito Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 15px 20px;
}
h1 {
  @apply font-[900] text-[20px] leading-none inline-block align-top;
  margin: 6px 0 6px 10px;
}
button + button {
  @apply ml-[10px];
}
.welcome {
  @apply mr-[10px] text-[14px];
  color: #333;
}
</style>
