import { useSyncExternalStore } from 'react'

export interface Toast {
  id: number
  kind: 'xp' | 'level' | 'badge' | 'streak' | 'info'
  text: string
}

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function pushToast(kind: Toast['kind'], text: string, ms = 3500) {
  const id = nextId++
  toasts = [...toasts, { id, kind, text }].slice(-4)
  emit()
  setTimeout(() => dismissToast(id), ms)
}

export const useToasts = (): Toast[] =>
  useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), () => toasts)
