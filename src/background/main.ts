import { onMessage } from 'typed-webext/message'
import Browser from 'webextension-polyfill'

Browser.runtime.onConnect.addListener(() => {
  console.log('Hello from the background script!')
})

onMessage('example', ({ data, sender }) => {
  console.log('sender', sender)
})
