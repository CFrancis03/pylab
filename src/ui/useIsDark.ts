import { useSyncExternalStore } from 'react'

const query = () => window.matchMedia('(prefers-color-scheme: dark)')

function snapshot(): boolean {
  const attr = document.documentElement.getAttribute('data-theme')
  return attr === 'dark' || (attr !== 'light' && query().matches)
}

function subscribe(cb: () => void) {
  const mq = query()
  mq.addEventListener('change', cb)
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => {
    mq.removeEventListener('change', cb)
    mo.disconnect()
  }
}

/** True when the page is currently rendered dark (explicit setting or OS preference). */
export const useIsDark = (): boolean => useSyncExternalStore(subscribe, snapshot)
