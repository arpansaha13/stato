import type { DefineComponent } from 'vue'
import type { UserConfig, AliasOptions } from 'vite'

export interface StatoConfig {
  /**
   * Vite config options.
   */
  viteOptions?: {
    resolve?: {
      alias?: AliasOptions
    }
    base?: UserConfig['base']
    css?: UserConfig['css']
    publicDir?: UserConfig['publicDir']
  }
}

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
