if (browser.devtools && browser.devtools.panels) {
  const inspectWindow = browser.devtools.inspectedWindow

  browser.devtools.panels.create(
    'WebExt Storage',
    '',
    '/pages/devtools-panel/index.html'
  )
}
