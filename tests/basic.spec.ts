import { expect } from '@playwright/test'
import { testExt } from './base'

testExt('Open sidepanel page', async ({ context, page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/pages/options/index.html`)
  await expect(page.locator('#root h1')).toHaveText('Options Page')
})
