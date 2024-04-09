import 'typed-webext'

declare module 'typed-webext' {
  interface MessageProtocol<T = unknown> {
    example: [never, never]
    'open-sidebar': [options: { windowId?: number } | undefined, never]
  }

  interface StreamProtocol {}

  interface StorageLocalProtocol {}
}
