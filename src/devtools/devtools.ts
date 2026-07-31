if (browser.devtools && browser.devtools.panels) {
  const inspectWindow = browser.devtools.inspectedWindow

  browser.devtools.panels
    .create('WebExt Storage', '', '/pages/devtools/index.html')
    .then((panel) => {
      panel.onShown.addListener((panelWindow) => {})
    })
}
