import 'typed-webext'

declare module 'typed-webext' {
  interface MessageProtocol<T = unknown> {
    example: [never, never]
    'open-sidebar': [options: { windowId?: number } | undefined, never]
    'toggle-sidebar': [options: { windowId?: number } | undefined, never]
    'to-sidepanel:close-sidepanel': [never, never]
  }

  interface StreamProtocol {}

  interface StorageLocalProtocol {
    'tips-records': Record<
      string,
      {
        viewed: boolean
        timestamp: number
        priority: number
      }
    >
  }
}
