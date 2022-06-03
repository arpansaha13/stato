export interface AwastConfig {
  content: string[]
}

export interface Book {
  name: string
  stories: {
    [key: string]: any
  }
}
