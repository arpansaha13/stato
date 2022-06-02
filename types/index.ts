import type { Argv } from 'mri'
import type { DefineComponent } from 'vue'

export interface AwastConfig {
  content: string[]
}

export interface Book {
  name: string
  component?: any
  stories: {
    [key: string]: any
  }
}

export interface AwastCommand {
  meta: {
    name: string
  }
  invoke: (args: Argv) => void
}
