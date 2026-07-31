// Use async IIFE to ensure content scirpt is loaded when using `scripting.executeScript`
;(async () => {
  await import(browser.runtime.getURL('content-scripts/content-scripts.js'))
})()
