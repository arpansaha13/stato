<template>
  <div class="container">
    <img class="logo" alt="Vue logo" src="./assets/logo.png" />
    <HelloWorld msg="Hello Vue 3 + Vite" />
  </div>
  <Button>Test button</Button>
  <Navbar />
  <Page />
</template>

<script setup>
import HelloWorld from './components/HelloWorld.vue'
import Button from './components/Button.vue'
import Navbar from './components/Navbar.vue'
import Page from './components/Page.vue'
</script>

<style scoped lang="sass">
.container
  font-family: Avenir, Helvetica, Arial, sans-serif
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale
  text-align: center
  color: #2c3e50
  margin-top: 60px

.logo
  display: block
  margin: 0 auto
</style>
