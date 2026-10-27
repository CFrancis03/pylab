import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'map' }
  | { name: 'region'; id: string }
  | { name: 'lesson'; id: string; lessonId: string }
  | { name: 'boss'; id: string }
  | { name: 'study' }
  | { name: 'review' }
  | { name: 'exam' }
  | { name: 'cards' }
  | { name: 'cheatsheet' }
  | { name: 'profile' }
  | { name: 'settings' }
  | { name: 'dev-engine' }
  | { name: 'dev-viz' }
  | { name: 'not-found' }

/** Hash routing keeps the site deployable on any static host with no server rewrites. */
export function matchRoute(path: string): Route {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return { name: 'map' }
  const [a, b, c, d] = parts
  if (a === 'region' && b && parts.length === 2) return { name: 'region', id: b }
  if (a === 'region' && b && c === 'lesson' && d && parts.length === 4) return { name: 'lesson', id: b, lessonId: d }
  if (a === 'region' && b && c === 'boss' && parts.length === 3) return { name: 'boss', id: b }
  if (a === 'study' && parts.length === 1) return { name: 'study' }
  if (a === 'study' && b === 'review' && parts.length === 2) return { name: 'review' }
  if (a === 'study' && b === 'exam' && parts.length === 2) return { name: 'exam' }
  if (a === 'study' && b === 'cards' && parts.length === 2) return { name: 'cards' }
  if (a === 'study' && b === 'cheatsheet' && parts.length === 2) return { name: 'cheatsheet' }
  if (a === 'profile' && parts.length === 1) return { name: 'profile' }
  if (a === 'settings' && parts.length === 1) return { name: 'settings' }
  if (a === 'dev' && b === 'engine' && parts.length === 2) return { name: 'dev-engine' }
  if (a === 'dev' && b === 'viz' && parts.length === 2) return { name: 'dev-viz' }
  return { name: 'not-found' }
}

const current = () => window.location.hash.replace(/^#/, '') || '/'

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export const useRoutePath = (): string => useSyncExternalStore(subscribe, current)

export const href = (path: string) => `#${path}`
