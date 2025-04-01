import type { BrowserContext } from '@playwright/test'
import { test as base, chromium } from '@playwright/test'
import path from 'node:path'

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  context: async ({ browser }, use) => {
    const pathToExt = path.join(process.cwd(), 'dist/dev')

    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
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

export const expect = test.expect
