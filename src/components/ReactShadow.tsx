import type { RefCallback } from 'react'
import { createContext, use, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  children?: React.ReactNode
}

const commonCSSURL = browser.runtime.getURL('styles.css')

export function ReactShadow({ children }: Props) {
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null)
  const [styleLoading, setStyleLoading] = useState(true)

  const init = useCallback<RefCallback<HTMLDivElement>>((el) => {
    setShadowRoot(el ? el.attachShadow({ mode: 'closed' }) : null)
  }, [])

  return (
    <ShadowContext value={{ shadowRoot: shadowRoot }}>
      <div ref={init} style={{ display: 'contents' }}>
        {shadowRoot &&
          createPortal(
            <>
              <link
                rel="stylesheet"
                href={commonCSSURL}
                onLoad={() => {
                  setStyleLoading(false)
                }}
              />
              {!styleLoading && children}
            </>,
            shadowRoot,
          )}
      </div>
    </ShadowContext>
  )
}

const ShadowContext = createContext<{ shadowRoot: ShadowRoot | null }>({
  shadowRoot: null,
})

export function useShadowContext() {
  return use(ShadowContext)
}
