import { useSyncExternalStore } from 'react'
import { PYODIDE_CACHE, PYODIDE_FILES } from './offlineConstants'

// ── update prompt ──────────────────────────────────────────────────────────

let applyUpdate: (() => void) | null = null
const listeners = new Set<() => void>()
const setApply = (fn: (() => void) | null) => {
  applyUpdate = fn
  listeners.forEach((l) => l())
}

/** A function that installs the waiting version and reloads, or null when the app is up to date. */
export const useUpdate = (): (() => void) | null =>
  useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), () => applyUpdate)

/**
 * Register the service worker (production builds only). A new version waits until the learner chooses
 * to update, so a reload never happens in the middle of a quiz.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The very first install also "changes" the controller; only reload for a real update.
    if (hadController && !reloading) {
      reloading = true
      window.location.reload()
    }
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        const offer = () => {
          if (reg.waiting && navigator.serviceWorker.controller) setApply(() => reg.waiting?.postMessage('SKIP_WAITING'))
        }
        offer()
        reg.addEventListener('updatefound', () => {
          const w = reg.installing
          w?.addEventListener('statechange', () => {
            if (w.state === 'installed') offer()
          })
        })
      })
      .catch(() => {
        // No service worker (private mode, blocked): the site simply works online only.
      })
  })
}

// ── offline Python runtime ─────────────────────────────────────────────────

const pyodideUrl = (file: string) => `${import.meta.env.BASE_URL}pyodide/${file}`

/** Is the whole Python runtime stored for offline use? */
export async function pyodideCached(): Promise<boolean> {
  if (!('caches' in window)) return false
  try {
    const cache = await caches.open(PYODIDE_CACHE)
    const hits = await Promise.all(PYODIDE_FILES.map((f) => cache.match(pyodideUrl(f))))
    return hits.every(Boolean)
  } catch {
    return false
  }
}

/** Download the Python runtime into the cache so code challenges work with no connection. */
export async function cachePyodide(onProgress: (done: number, total: number) => void): Promise<void> {
  const cache = await caches.open(PYODIDE_CACHE)
  let done = 0
  for (const f of PYODIDE_FILES) {
    const url = pyodideUrl(f)
    if (!(await cache.match(url))) {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Could not download ${f} (${res.status}).`)
      await cache.put(url, res)
    }
    onProgress(++done, PYODIDE_FILES.length)
  }
}
