import { onMessage } from 'typed-webext/message'
import Browser from 'webextension-polyfill'

Browser.runtime.onConnect.addListener(() => {
  console.log('Hello from the background script!')
})

onMessage('example', ({ data, sender }) => {
  console.log('sender', sender)
})

onMessage('open-sidebar', ({ data }) => {
  if (!Browser.sidePanel) {
    throw new Error('sidePanel is not available')
  }

  return Browser.sidePanel.open(data)
})
