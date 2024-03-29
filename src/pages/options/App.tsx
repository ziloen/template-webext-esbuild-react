import { sendMessage } from 'typed-webext/message'
import Browser from 'webextension-polyfill'

export default function App() {
  return (
    <div>
      <h1 className="text-blue-600">Options Page</h1>

      <button
        className=""
        id="sidebar-btn"
        onClick={async () => {
          const current = await Browser.tabs.getCurrent()
          if (!current) return
          if (!current.windowId) return

          sendMessage('open-sidebar', {
            windowId: current.windowId,
          })
        }}
      >
        Open Sidebar
      </button>
    </div>
  )
}
