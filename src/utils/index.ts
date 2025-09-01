import type { Events } from 'webextension-polyfill'
import Browser from 'webextension-polyfill'

export function listenExtensionEvent<CB extends (...args: any[]) => any>(
  target: Events.Event<CB>,
  callback: NoInfer<CB>,
  options?: { signal?: AbortSignal },
): () => void {
  const signal = options?.signal

  if (signal?.aborted) {
    return () => {}
  }

  target.addListener(callback)

  const removeListener = () => target.removeListener(callback)

  if (signal) {
    signal.addEventListener('abort', removeListener, { once: true })

    return () => {
      removeListener()
      signal.removeEventListener('abort', removeListener)
    }
  }

  return removeListener
}

export async function getActiveTab() {
  const tab = (
    await Browser.tabs.query({ active: true, currentWindow: true })
  )[0]
  if (!tab) throw new Error('No active tab found')
  return tab
}
