import './main.css'

import { createRoot } from 'react-dom/client'
import { onMessage } from 'typed-webext'
import App from './App'

onMessage.to_sidepanel_close_sidepanel(() => {
  // FIXME: 如果在 sidepanel 完全关闭前再次打开（快速 toggle），window.close 会不再起作用
  window.close()
})

createRoot(document.getElementById('root')!).render(<App />)
