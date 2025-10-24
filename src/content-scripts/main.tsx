import { createRoot } from 'react-dom/client'
import Browser from 'webextension-polyfill'
import { App } from './App'

Browser.runtime.onMessage.addListener(() => {
  console.log('Hello from the content script!')
  return undefined
})

const container = document.createElement('div')
container.id = '__webext-container__'

document.body.append(container)

const shadow = container.attachShadow({ mode: 'closed' })
const root = createRoot(shadow)

root.render(<App />)
