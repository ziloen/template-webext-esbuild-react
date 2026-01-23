import { expect, test } from './base'

test('Build HTML and CSS', async ({ context, page, extensionId }) => {
  const testUrl = `chrome-extension://${extensionId}/pages/test-page.html`

  await page.goto(testUrl)
  const h1 = page.locator('#root h1')
  await expect(h1).toHaveText('Test')
  await expect(h1).toHaveCSS('font-size', '24px')

  // await context.waitForEvent('page', page => page.url().startsWith(sidebarUrl))
})
