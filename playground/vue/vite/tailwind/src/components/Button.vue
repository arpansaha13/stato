<template>
  <button type="button" :class="classes">
    <slot />
  </button>
</template>

<script lang="ts">
import { reactive, computed, defineComponent } from 'vue'

export default defineComponent({
  name: 'Button',
  props: {
    primary: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value: string) => {
        return ['small', 'medium', 'large'].indexOf(value) !== -1
      },
    },
  },

  setup(props) {
    props = reactive(props)
    return {
      classes: computed(() => ({
        button: true,
        'button--primary': props.primary,
        'button--secondary': !props.primary,
        [`button--${props.size}`]: true,
      })),
    }
  },
})
</script>

<style scoped>
.button {
  font-family: 'Nunito Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  @apply font-bold border-none rounded-[0.3em] cursor-pointer inline-block leading-none;
  transition: background-color 80ms ease-in-out;
}

.button--primary {
  @apply text-white bg-blue-500;
}
.button--primary:hover {
  @apply bg-blue-600;
}
.button--primary:active {
  @apply bg-blue-700;
}

.button--secondary {
  @apply bg-transparent text-[#111827];
  box-shadow: rgba(0, 0, 0, 0.15) 0px 0px 0px 1px inset;
}
.button--secondary:hover {
  @apply bg-gray-100;
}
.button--secondary:active {
  @apply bg-gray-200;
}

.button--small {
  @apply px-4 py-[10px] text-[12px];
}

.button--medium {
  @apply px-[20px] py-[11px] text-[14px];
}

.button--large {
  @apply px-[24px] py-[12px] text-[16px];
}
</style>
