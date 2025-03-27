declare module 'react' {
  // fix react forwardRef, https://stackoverflow.com/questions/58469229/react-with-typescript-generics-while-using-react-forwardref
  function forwardRef<T, P = {}>(
    render: (props: P, ref: ForwardedRef<T>) => ReactElement | null
  ): (props: P & RefAttributes<T>) => ReactElement | null

  // allow style to use css custom properties
  interface CSSProperties {
    [CSSCutomProperties: `--${string}`]: string | number | undefined
  }

  // allow destructor return value
  function useEffect(
    effect: () => void | (() => void),
    deps?: DependencyList
  ): void
  function useInsertionEffect(
    effect: () => void | (() => void),
    deps?: DependencyList
  ): void
  function useLayoutEffect(
    effect: () => void | (() => void),
    deps?: DependencyList
  ): void
}

declare module 'webextension-polyfill' {
  const sidePanel: typeof chrome.sidePanel | undefined

  namespace Storage {
    interface StorageArea {
      /**
       * Gets the amount of storage space, in bytes, used by one or more items stored in the storage area.
       *
       * @param keys A key (string) or keys (an array of strings) to identify the items whose storage space you want to retrieve. If an empty array is passed in, 0 is returned. If you pass `null` or `undefined`, the function returns the space used by the entire storage area.
       *
       * @returns A `Promise` that is fulfilled with an integer, `bytesUsed`, representing the storage space used by the objects specified in `keys`. If the operation fails, the promise is rejected with an error message.
       *
       * [MDN Reference](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/getBytesInUse)
       */
      getBytesInUse?(keys: null | string | string[]): Promise<number>
    }
  }
}

export { }

