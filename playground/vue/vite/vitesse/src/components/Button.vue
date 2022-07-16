<template>
  <button type="button" :class="classes">
    <slot />
  </button>
</template>

<script lang="ts">
import '../styles/button.css'

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
