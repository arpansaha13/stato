import type { Argv } from 'mri'
import type { DefineComponent } from 'vue'

export interface AwastConfig {
  content: string[]
}

type Story = () => DefineComponent<{}, {}, any>

export interface Book {
  default: {
    name: string
  }
  stories: Story[]
}

export interface AwastCommand {
  meta: {
    name: string
  }
  invoke: (args: Argv) => void
}
