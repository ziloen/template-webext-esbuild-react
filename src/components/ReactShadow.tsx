import {
  createContext,
  use,
  useCallback,
  useState,
  type RefCallback,
} from 'react'
import { createPortal } from 'react-dom'
import Browser from 'webextension-polyfill'

type Props = {
  children?: React.ReactNode
  /**
   * @default 'closed'
   */
  mode?: 'open' | 'closed'
}

export function ReactShadow({ children, mode = 'closed' }: Props) {
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null)
  const [styleLoading, setStyleLoading] = useState(true)

  const init = useCallback<RefCallback<HTMLDivElement>>((el) => {
    if (el) {
      const shadow = el.attachShadow({ mode })
      setShadowRoot(shadow)
    } else {
      setShadowRoot(null)
    }
  }, [])

  return (
    <ShadowContext value={{ shadowRoot: shadowRoot }}>
      <div ref={init} style={{ display: 'contents' }}>
        {shadowRoot &&
          createPortal(
            <>
              <link
                rel="stylesheet"
                href={Browser.runtime.getURL('common.css')}
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
