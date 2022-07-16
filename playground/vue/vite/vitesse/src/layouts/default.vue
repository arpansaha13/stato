<template>
  <div>
    <Navbar
      :user="user"
      @login="onLogin"
      @logout="onLogout"
      @createAccount="onCreateAccount"
    />
    <RouterView />
  </div>
</template>

<script lang="ts">
export default defineComponent({
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
