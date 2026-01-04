import Browser from 'webextension-polyfill'

if (Browser.devtools && Browser.devtools.panels) {
  const inspectWindow = Browser.devtools.inspectedWindow

  Browser.devtools.panels
    .create('WebExt Storage', '', '/pages/devtools/index.html')
    .then((panel) => {
      panel.onShown.addListener((panelWindow) => {})
    })
}
