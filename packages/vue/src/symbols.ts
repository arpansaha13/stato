import type { InjectionKey, Ref } from 'vue'

// Injection keys
export const InjectActiveStoryKey: InjectionKey<Ref<string>> =
  Symbol('active-story-key')
export const InjectSelectStoryFn: InjectionKey<
  (nesting: string[], bookName: string, storyName: string) => () => void
> = Symbol('select-story-fn')
