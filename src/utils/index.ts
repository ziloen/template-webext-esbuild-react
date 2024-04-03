import type { Events } from 'webextension-polyfill'

/** {@link listenEvent} */
type InferCallback<T> = T extends Events.Event<infer U> ? U : never

export function listenEvent<T extends Events.Event<(...args: any[]) => any>>(
  target: T,
  callback: InferCallback<T>,
  options?: { signal?: AbortSignal }
) {
  target.addListener(callback)

  const signal = options?.signal

  const removeListener = () => target.removeListener(callback)

  if (signal) {
    signal.addEventListener('abort', removeListener)
  }

  return () => {
    removeListener()
    target.removeListener(callback)
  }
}
