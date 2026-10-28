import { useRef, useState } from 'react'
import NameDiagram from './NameDiagram'
import { findScenario } from './registry'
import TraceTracks from './TraceTracks'
import StepPlayer from './StepPlayer'

interface Props {
  /** Scenario ids to offer as tabs. */
  scenarios: string[]
  /** Fired once every scenario has been stepped through to its last frame. */
  onFinished: () => void
}

/** Tabbed set of step-through scenarios. Complete when each has been played to the end. */
export default function ScenarioVisualizer({ scenarios, onFinished }: Props) {
  const list = scenarios.map(findScenario).filter((x) => x !== undefined)
  const [active, setActive] = useState(0)
  const [seen, setSeen] = useState<string[]>([])
  // Mirrors `seen` so the end-of-scenario callback never reads a stale list.
  const seenRef = useRef<string[]>([])
  const s = list[active]
  if (!s) return <p className="muted">This visualizer has no scenarios.</p>

  const markSeen = (id: string) => {
    if (seenRef.current.includes(id)) return
    const next = [...seenRef.current, id]
    seenRef.current = next
    setSeen(next)
    if (next.length === list.length) onFinished()
  }

  return (
    <div className="viz">
      <div className="tabs" role="tablist" aria-label="Scenarios">
        {list.map((x, i) => (
          <button key={x.id} role="tab" aria-selected={i === active} className={`tab${i === active ? ' on' : ''}`} onClick={() => setActive(i)} data-testid={`tab-${x.id}`}>
            {seen.includes(x.id) ? '✓ ' : ''}{x.title}
          </button>
        ))}
      </div>
      <p className="muted small" data-testid="viz-progress">{seen.length}/{list.length} scenarios explored. Step each one to the end.</p>
      {/* Re-mount per scenario so every tab starts at its first frame. */}
      <StepPlayer key={s.id} count={s.frames.length} onEnd={() => markSeen(s.id)}>
        {(i) => {
          const f = s.frames[i]
          return (
            <div className="viz-grid">
              <ol className="viz-code" aria-label="Code" tabIndex={0}>
                {s.code.split('\n').map((line, n) => (
                  <li key={n} className={f.line === n + 1 ? 'cur' : ''} aria-current={f.line === n + 1 ? 'step' : undefined}>
                    <code>{line || ' '}</code>
                  </li>
                ))}
              </ol>
              {'tracks' in f ? (
                <TraceTracks tracks={f.tracks} />
              ) : (
                <div className="diagram-wrap" tabIndex={0}>
                  <NameDiagram frame={f} />
                </div>
              )}
              <p className="viz-note" data-testid="viz-note">{f.note}</p>
              <pre className="viz-out" tabIndex={0} aria-label="Printed output" data-testid="viz-out">{f.out.length ? f.out.join('\n') : '(nothing printed yet)'}</pre>
            </div>
          )
        }}
      </StepPlayer>
    </div>
  )
}
