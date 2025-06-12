import { onMessage, sendMessage } from 'typed-webext'
import Browser from 'webextension-polyfill'
import { getActiveTab } from '~/utils'

Browser.runtime.onConnect.addListener(() => {
  console.log('Hello from the background script!')
})

onMessage('example', ({ data, sender }) => {
  console.log('sender', sender)
})

onMessage('open-sidebar', async ({ data = {}, sender }) => {
  if (Browser.sidebarAction) {
    return Browser.sidebarAction.open()
  }

  if (!Browser.sidePanel) {
    throw new Error('Sidebar is not available')
  }

  let windowId: number | undefined = data.windowId ?? sender.tab?.windowId

  if (windowId === undefined) {
    windowId = (await getActiveTab()).windowId
    if (windowId === undefined) {
      throw new Error('windowId is not available')
    }
  }

  return Browser.sidePanel.open({
    windowId,
  })
})

onMessage('toggle-sidebar', async ({ data = {}, sender }) => {
  if (Browser.sidebarAction) {
    return Browser.sidebarAction.toggle()
  }

  if (!Browser.sidePanel) {
    throw new Error('Sidebar is not available')
  }

  let windowId: number | undefined = data.windowId ?? sender.tab?.windowId

  if (windowId === undefined) {
    windowId = (await getActiveTab()).windowId
    if (windowId === undefined) {
      throw new Error('windowId is not available')
    }
  }

  const openPromise = Browser.sidePanel.open({ windowId })
  return sendMessage('to-sidepanel:close-sidepanel').catch(() => openPromise)
})
