import 'typed-webext'

declare module 'typed-webext' {
  interface MessageProtocol<T = unknown> {
    example: [never, never]
  }

  interface StreamProtocol {}

  interface StorageLocalProtocol {}
}
