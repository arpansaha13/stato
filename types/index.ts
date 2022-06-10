import { DefineComponent } from 'vue'

export interface StatoConfig {
  content: string[]
}

export interface StoryReturn {
  components?: Record<string, DefineComponent<{}, {}, any>>
  setup: () => Record<string, any>
  template: string
}

export type Story = () => StoryReturn

export interface Book {
  name: string
  stories: {
    [key: string]: Story
  }
}

export interface IframeEnv {
  IFRAME_SERVER_HOST: string
  IFRAME_SERVER_PORT: number
}
