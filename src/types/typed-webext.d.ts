import 'typed-webext'

declare module 'typed-webext' {
  interface MessageProtocol<T = unknown> {
    example: [never, never]
    'open-sidebar': [chrome.sidePanel.OpenOptions, never]
  }

  interface StreamProtocol {}

  interface StorageLocalProtocol {}
}
