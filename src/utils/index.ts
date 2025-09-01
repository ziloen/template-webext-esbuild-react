import Browser from 'webextension-polyfill'

export async function getActiveTab() {
  const tab = (
    await Browser.tabs.query({ active: true, currentWindow: true })
  )[0]
  if (!tab) throw new Error('No active tab found')
  return tab
}
