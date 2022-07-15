import { onMounted, ref } from 'vue'
import type { CSSProperties, Ref } from 'vue'
import {
  logicNot,
  templateRef,
  useEventListener,
  useMouse,
  watchPausable,
  whenever,
} from '@vueuse/core'

interface ResizeHandler {
  ref: Ref<HTMLElement | SVGElement> | string
  /**
   * Invert the direction in which the resizing happens.
   *
   * @default
   * 'normal'
   */
  direction?: 'normal' | 'inverted'
}

interface ResolvedResizeHandler {
  ref: Ref<HTMLElement | SVGElement>
  direction?: 'normal' | 'inverted'
}

interface ResizeRange {
  min?: string
  max?: string
  initial?: string
}

/** The return value of useHResize() */
interface ResizeReturn {
  resizing: Ref<boolean>
  style: Ref<CSSProperties>
}

/**
 * Function to get the template ref using the ref string (if the parameter is a string), else return the parameter as it is
 * @param r template ref or ref string to resolve
 */
function resolveTemplateRef(r: Ref<HTMLElement | SVGElement> | string) {
  return typeof r === 'string' ? templateRef(r) : r
}

function resolveHandlers(
  handlers: ResizeHandler | ResizeHandler[]
): ResolvedResizeHandler[] | null {
  let temp: ResizeHandler[] | null

  if (Array.isArray(handlers)) {
    temp = [...handlers]
  } else if (typeof handlers === 'object' && handlers !== null) {
    // Put the single handler inside an array so that the loops can work
    temp = [handlers]
  } else {
    temp = null
  }
  if (temp !== null) {
    for (const handler of temp) {
      handler.ref = resolveTemplateRef(handler.ref) as Ref<
        HTMLElement | SVGElement
      >
    }
  }
  return temp as ResolvedResizeHandler[] | null
}

/**
 * Resize an element horizontally. It returns a style ref object which can be used as inline styles on the target.
 *
 * If the resizing does not work properly check for conflicting css.
 * Also ensure that the mouse pointer is in the same document during the resize.
 * For example if there is an iframe, then the mouse pointer won't be in the same document.
 * @param target template ref, or just the ref string, of the element which is to be resized.
 * @param handlers a single resize handler or an array of handlers
 * @param range initial width, min-width and max-width as css values.
 * @param sensitivity sensitivity of resizing - how fast should the resize happen
 */
export function useHResize(
  target: Ref<HTMLElement> | string,
  handlers: ResizeHandler | ResizeHandler[],
  range?: ResizeRange,
  sensitivity: number = 1
): ResizeReturn {
  const el = resolveTemplateRef(target) as Ref<HTMLElement>

  const h = resolveHandlers(handlers)

  if (h === null) {
    console.error('useHResize: Invalid handler(s)')
    return { resizing: ref(false), style: ref({}) }
  }

  // Detect dragging of handler
  const resizing = ref(false)
  const handlerDirection = ref('normal') // The direction of the handler that is being used for the resizing

  function disableSelection(e: Event) {
    e.preventDefault()
  }

  for (const handler of h) {
    useEventListener(handler.ref, 'mousedown', () => {
      resizing.value = true
      handlerDirection.value = handler.direction ?? 'normal'
      // Prevent text selection during resize
      window.addEventListener('selectstart', disableSelection)
    })
  }
  useEventListener(document, 'mouseup', () => {
    if (resizing.value) {
      resizing.value = false
      window.removeEventListener('selectstart', disableSelection)
    }
  })

  // Initial style for width on target element
  const width = ref('')
  const style = ref<CSSProperties>({
    width: `clamp(${range?.min ?? '0px'}, ${range?.initial ?? '100%'}, ${
      range?.max ?? '100%'
    })`,
  })

  // Calculate new width
  const { x } = useMouse()
  const xSnap = ref(x.value)
  let currentWidth = 0

  onMounted(() => {
    currentWidth = el.value.offsetWidth
  })

  const { pause, resume } = watchPausable(x, (val) => {
    // New width
    if (handlerDirection.value === 'normal') {
      width.value = `${currentWidth + sensitivity * (val - xSnap.value)}px`
    } else {
      width.value = `${currentWidth + sensitivity * (xSnap.value - val)}px`
    }

    // New style
    style.value = {
      width: `clamp(${range?.min ?? '0px'}, ${width.value}, ${
        range?.max ?? '100%'
      })`,
    }
  })

  whenever(resizing, () => {
    // Take a snap of mouses-x value when resizing starts.
    xSnap.value = x.value
    currentWidth = el.value.offsetWidth
    resume()
  })
  // Pause when resizing stops. At start it should always be paused.
  whenever(logicNot(resizing), pause, { immediate: true })

  return { resizing, style }
}
