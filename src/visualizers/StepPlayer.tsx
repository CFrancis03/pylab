import { useEffect, useState, type ReactNode } from 'react'

interface Props {
  count: number
  /** Called each time the final step is shown. */
  onEnd?: () => void
  /** Render the content for step `index`. */
  children: (index: number) => ReactNode
}

/** Back / next / auto-play controls over a fixed number of steps. Arrow keys work when focused. */
export default function StepPlayer({ count, onEnd, children }: Props) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const last = count - 1

  useEffect(() => {
    if (index === last) onEnd?.()
    // onEnd is intentionally not a dependency: it should fire when the last step is reached, not when its identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, last])

  useEffect(() => {
    if (!playing) return
    if (index >= last) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setIndex((i) => Math.min(i + 1, last)), 1800)
    return () => clearTimeout(t)
  }, [playing, index, last])

  const go = (i: number) => {
    setPlaying(false)
    setIndex(Math.max(0, Math.min(last, i)))
  }

  return (
    <div
      className="stepper" tabIndex={0} data-testid="stepper"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1) }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1) }
      }}
    >
      {children(index)}
      <div className="row stepper-controls">
        <button className="ghost" onClick={() => go(0)} disabled={index === 0} aria-label="Restart">⏮</button>
        <button className="ghost" onClick={() => go(index - 1)} disabled={index === 0} data-testid="prev">← Back</button>
        <button onClick={() => go(index + 1)} disabled={index === last} data-testid="next-step">Step →</button>
        <button className="ghost" onClick={() => (index >= last ? go(0) : setPlaying((p) => !p))} data-testid="play" aria-pressed={playing}>
          {playing ? '⏸ Pause' : index >= last ? '↺ Replay' : '▶ Play'}
        </button>
        <span className="muted small" data-testid="step-count" aria-live="polite">Step {index + 1} of {count}</span>
      </div>
      <p className="muted small">Tip: click here and use the ← → arrow keys.</p>
    </div>
  )
}
