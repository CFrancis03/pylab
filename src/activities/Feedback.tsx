import type { ReactNode } from 'react'

/** Result banner shared by every activity. */
export default function Feedback({ kind, children }: { kind: 'good' | 'bad' | 'info'; children: ReactNode }) {
  return (
    <div className={`feedback feedback-${kind}`} role={kind === 'bad' ? 'alert' : 'status'} data-testid={`feedback-${kind}`}>
      {children}
    </div>
  )
}
