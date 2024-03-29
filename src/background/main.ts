import { onMessage } from 'typed-webext/message'
import Browser from 'webextension-polyfill'

Browser.runtime.onConnect.addListener(() => {
  console.log('Hello from the background script!')
})

onMessage('example', ({ data, sender }) => {
  console.log('sender', sender)
})

onMessage('open-sidebar', ({ data, sender }) => {
  if (Browser.sidebarAction) {
    return Browser.sidebarAction.open()
  }

  if (!Browser.sidePanel) {
    throw new Error('Sidebar is not available')
  }

  const windowId = data.windowId ?? sender.tab?.windowId

  if (!windowId) {
    throw new Error('windowId is not available')
  }

  return Browser.sidePanel.open({
    windowId,
  })
})
