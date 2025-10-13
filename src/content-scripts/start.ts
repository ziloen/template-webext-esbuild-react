import Browser from 'webextension-polyfill'

if (document.readyState === 'loading') {
  window.addEventListener(
    'DOMContentLoaded',
    () => {
      import(Browser.runtime.getURL('content-scripts/main.js'))
    },
    { once: true },
  )
} else {
  import(Browser.runtime.getURL('content-scripts/main.js'))
}
