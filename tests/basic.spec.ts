/* eslint-disable no-empty-pattern */
import type { BrowserContext } from '@playwright/test'
import { test as base, chromium, expect } from '@playwright/test'
import path from 'node:path'

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  context: async ({}, use) => {
    const pathToExt = path.join(process.cwd(), 'dist/dev')
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--headless=new`,
        `--disable-extensions-except=${pathToExt}`,
        `--load-extension=${pathToExt}`,
      ],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background) {
      background = await context.waitForEvent('serviceworker')
    }
    const extensionId = background.url().split('/')[2]!
    await use(extensionId)
  },
})

test('install extension', async ({ context, page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/pages/options/index.html`)
  await expect(page.locator('#root')).toHaveText('Options Page')
})
