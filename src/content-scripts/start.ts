const browser = globalThis.browser ?? globalThis.chrome

if (document.readyState === 'loading') {
  window.addEventListener(
    'DOMContentLoaded',
    () => {
      import(browser.runtime.getURL('content-scripts/main.js'))
    },
    { once: true },
  )
} else {
  import(browser.runtime.getURL('content-scripts/main.js'))
}
