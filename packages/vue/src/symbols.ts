import type { InjectionKey, Ref } from 'vue'

// Injection key
export const ModulesTableKey: InjectionKey<Ref<number>> =
  Symbol('modules-table')
