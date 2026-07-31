import { createRoot } from 'react-dom/client'
import { domReady } from '~/utils'
import { App } from './App'

browser.runtime.onMessage.addListener(() => {
  console.log('Hello from the content script!')
  return undefined
})

await domReady()

const container = document.createElement('div')
container.id = '__webext-container__'

document.body.append(container)

const shadow = container.attachShadow({ mode: 'closed' })
const root = createRoot(shadow)

root.render(<App />)
