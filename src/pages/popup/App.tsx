import { sendMessage } from 'typed-webext'

export default function App() {
  return (
    <div>
      <h1 className="text-blue-600">Popup Page</h1>

      <button
        onClick={() => {
          browser.runtime.openOptionsPage()
        }}
      >
        Open Options Page
      </button>

      <div></div>

      <button
        onClick={() => {
          sendMessage.open_sidebar(undefined)
        }}
      >
        Open Sidebar
      </button>
    </div>
  )
}
