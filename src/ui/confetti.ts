import { useSyncExternalStore } from 'react'

let burst = 0
const listeners = new Set<() => void>()

/** Trigger a short celebration. */
export function celebrate() {
  burst++
  listeners.forEach((l) => l())
}

/** Increments each time a celebration is requested (0 before the first). */
export const useBurst = (): number => useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), () => burst)
