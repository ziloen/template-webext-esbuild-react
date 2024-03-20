import Browser from 'webextension-polyfill'

Browser.runtime.onConnect.addListener(() => {
  console.log()
})

Browser.runtime.getURL("a")