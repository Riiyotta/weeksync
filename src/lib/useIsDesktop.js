import { useSyncExternalStore } from 'react'

const QUERY = '(min-width: 1024px)'
const mql = typeof window !== 'undefined' ? window.matchMedia(QUERY) : null

function subscribe(cb) {
  mql?.addEventListener('change', cb)
  return () => mql?.removeEventListener('change', cb)
}

export default function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => (mql ? mql.matches : true))
}
