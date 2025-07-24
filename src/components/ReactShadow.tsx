import { useCallback, useState, type RefCallback } from 'react'
import { createPortal } from 'react-dom'
import Browser from 'webextension-polyfill'

export function ReactShadow({ children }: { children?: React.ReactNode }) {
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null)
  const [tailwindLoading, setTailwindLoading] = useState(true)
  const [fontsLoading, setFontsLoading] = useState(true)

  const init = useCallback<RefCallback<HTMLDivElement>>((el) => {
    if (el) {
      const shadow = el.attachShadow({ mode: 'closed' })
      setShadowRoot(shadow)
    } else {
      setShadowRoot(null)
    }
  }, [])

  return (
    <div ref={init} style={{ display: 'contents' }}>
      {shadowRoot &&
        createPortal(
          <>
            <link
              rel="stylesheet"
              as="style"
              href={Browser.runtime.getURL('tailwind.css')}
              onLoad={(e) => {
                setTailwindLoading(false)
              }}
            />
            <link
              rel="stylesheet"
              href={Browser.runtime.getURL('fonts.css')}
              onLoad={() => {
                setFontsLoading(false)
              }}
            />
            {!tailwindLoading && !fontsLoading && children}
          </>,
          shadowRoot,
        )}
    </div>
  )
}
