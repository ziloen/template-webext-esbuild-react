import type { BrowserContext } from '@playwright/test'
import { test as base, chromium } from '@playwright/test'
import path from 'node:path'

process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1'
const pathToExt = path.join(process.cwd(), 'dist/dev')

export const testExt = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  context: async ({ browser }, use) => {
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
