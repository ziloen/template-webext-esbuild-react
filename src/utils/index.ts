import type { Events } from 'webextension-polyfill'
import Browser from 'webextension-polyfill'

/** {@link listenEvent} */
type InferCallback<T> = T extends Events.Event<infer U> ? U : never

export function listenEvent<T extends Events.Event<(...args: any[]) => any>>(
  target: T,
  callback: InferCallback<NoInfer<T>>,
  options?: { signal?: AbortSignal },
) {
  target.addListener(callback)

  const signal = options?.signal

  const removeListener = () => target.removeListener(callback)

  if (signal) {
    signal.addEventListener('abort', removeListener, { once: true })
  }

  return () => {
    removeListener()
    target.removeListener(callback)
  }
}

export async function getActiveTab() {
  const tab = (
    await Browser.tabs.query({ active: true, currentWindow: true })
  )[0]
  if (!tab) throw new Error('No active tab found')
  return tab
}
