import { onMessage, sendMessage } from 'typed-webext'
import { getActiveTab } from '~/utils'
import { grantAllUrlPermission } from './grant-all-url-permission'

if (IS_FIREFOX_ENV) {
  grantAllUrlPermission()
}

browser.runtime.onConnect.addListener(() => {
  console.log('Hello from the background script!')
})

onMessage.example(({ data, sender }) => {
  console.log('sender', sender)
})

onMessage.open_sidebar(async ({ data = {}, sender }) => {
  if (browser.sidebarAction) {
    return browser.sidebarAction.open()
  }

  if (!browser.sidePanel) {
    throw new Error('Sidebar is not available')
  }

  let windowId: number | undefined = data.windowId ?? sender.tab?.windowId

  if (windowId === undefined) {
    windowId = (await getActiveTab()).windowId
    if (windowId === undefined) {
      throw new Error('windowId is not available')
    }
  }

  return browser.sidePanel.open({
    windowId,
  })
})

onMessage.toggle_sidebar(async ({ data = {}, sender }) => {
  if (browser.sidebarAction) {
    return browser.sidebarAction.toggle()
  }

  if (!browser.sidePanel) {
    throw new Error('Sidebar is not available')
  }

  let windowId: number | undefined = data.windowId ?? sender.tab?.windowId

  if (windowId === undefined) {
    windowId = (await getActiveTab()).windowId
    if (windowId === undefined) {
      throw new Error('windowId is not available')
    }
  }

  const openPromise = browser.sidePanel.open({ windowId })
  return sendMessage.to_sidepanel_close_sidepanel().catch(() => openPromise)
})
