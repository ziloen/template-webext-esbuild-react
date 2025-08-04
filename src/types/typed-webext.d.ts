import 'typed-webext'

declare module 'typed-webext' {
  interface MessageProtocol<T = unknown> {
    example: [never, never]
    open_sidebar: [options: { windowId?: number } | undefined, never]
    toggle_sidebar: [options: { windowId?: number } | undefined, never]
    to_sidepanel_close_sidepanel: [never, never]
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
