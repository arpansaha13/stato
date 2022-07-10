import { DefineComponent } from 'vue'
import { UserConfig } from 'vite'

export interface StatoConfig {
  /**
   * Vite config options.
   */
  viteOptions?: {
    base: UserConfig['base']
    css: UserConfig['css']
    publicDir: UserConfig['publicDir']
  }
}

// export interface StoryReturn {
//   components?: Record<string, DefineComponent<{}, {}, any>>
//   setup: () => Record<string, any>
//   template: string
// }

// export type Story = () => StoryReturn

export interface Story {
  components?: Record<string, DefineComponent<{}, {}, any>>
  setup?: () => Record<string, any>
  template: string
}
export interface Book {
  stories: {
    [key: string]: Story
  }
}
export interface IframeEnv {
  IFRAME_SERVER_HOST: string
  IFRAME_SERVER_PORT: number
}
