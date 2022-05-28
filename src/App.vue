<template>
  <div class="container">
    <aside ref="target" class="sidebar" :style="style">
      <div ref="handler" class="resize-handle" />
    </aside>

    <div class="screen">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHResize } from './composables/useHResize'

const style = useHResize(
  'target',
  { ref: 'handler', direction: 'normal' },
  { min: '6rem', initial: '16rem', max: '32rem' }
)
</script>

<style scoped>
.container {
  display: flex;
  width: 100vw;
  height: 100vh;
}
.sidebar {
  height: 100%;
  background-color: #e5e7eb;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}
.screen {
  height: 100%;
  flex-grow: 1;
}
.resize-handle {
  margin-left: auto;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
  transition-property: background-color;
  transition-duration: 300ms;
  transition-delay: 300ms;
}
.resize-handle:hover,
.resize-handle:active {
  background-color: #3b82f6;
}
</style>
