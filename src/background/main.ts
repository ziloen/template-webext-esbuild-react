import Browser from 'webextension-polyfill'

Browser.runtime.onConnect.addListener(() => {
  console.log()
})
