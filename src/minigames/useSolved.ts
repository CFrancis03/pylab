import { useRef, useState } from 'react'

/** Tracks which levels are cleared and calls `onFinished` exactly once, when the last one is. */
export function useSolved(ids: string[], onFinished: () => void) {
  const [solved, setSolved] = useState<string[]>([])
  const ref = useRef<string[]>([])
  const fired = useRef(false)
  const mark = (id: string) => {
    if (ref.current.includes(id)) return
    ref.current = [...ref.current, id]
    setSolved(ref.current)
    if (!fired.current && ids.every((i) => ref.current.includes(i))) {
      fired.current = true
      onFinished()
    }
  }
  return { solved, mark }
}
