import { DefineComponent } from 'vue'

export interface AwastConfig {
  content: string[]
}

export interface StoryReturn {
  components?: Record<string, DefineComponent<{}, {}, any>>
  setup: () => { vars: Record<string, any> }
  template: string
}

export type Story = () => StoryReturn

export interface Book {
  name: string
  stories: Story[]
}
