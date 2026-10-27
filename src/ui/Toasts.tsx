import { dismissToast, useToasts } from '../game/toasts'

export default function Toasts() {
  const toasts = useToasts()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismissToast(t.id)}>{t.text}</button>
      ))}
    </div>
  )
}
