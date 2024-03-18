import '~/styles'

import { createRoot } from 'react-dom/client'
import Browser from 'webextension-polyfill'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)

Browser.runtime.getURL("123")