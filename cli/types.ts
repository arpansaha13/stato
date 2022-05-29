import type { Argv } from 'mri'
import type { DefineComponent } from 'vue'

export interface VitleConfig {
  content: string[]
}

type Story = () => DefineComponent<{}, {}, any>

export interface Book {
  default: {
    name: string
  }
  stories: Story[]
}

export interface VitleCommand {
  meta: {
    name: string
  }
  invoke: (args: Argv) => void
}
