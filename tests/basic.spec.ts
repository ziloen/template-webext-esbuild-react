import { expect } from '@playwright/test'
import { testExt } from './base'

testExt('Open sidepanel page', async ({ context, page, extensionId }) => {
  const optionsUrl = `chrome-extension://${extensionId}/pages/options/index.html`
  const sidebarUrl = `chrome-extension://${extensionId}/pages/sidebar/index.html`

  await page.goto(optionsUrl)
  await expect(page.locator('#root h1')).toHaveText('Options Page')

  // await context.waitForEvent('page', page => page.url().startsWith(sidebarUrl))
})
