import Browser from 'webextension-polyfill'

Browser.runtime.onMessage.addListener(() => {
  console.log('Hello from the content script!')
})
