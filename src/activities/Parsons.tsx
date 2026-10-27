import { useMemo, useState } from 'react'
import { Rich } from '../ui/Md'
import type { Parsons as P } from '../content/schema'
import Feedback from './Feedback'
import { checkParsons, shuffleSeeded } from './logic'

interface Item {
  id: number
  text: string
}

export default function Parsons({ a, onResult }: { a: P; onResult: (correct: boolean) => void }) {
  const pool = useMemo(
    () => shuffleSeeded([...a.lines, ...a.distractors].map((text, id): Item => ({ id, text })), a.id),
    [a],
  )
  const [built, setBuilt] = useState<Item[]>([])
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [state, setState] = useState<'open' | 'wrong' | 'right'>('open')
  const locked = state === 'right'
  const unused = pool.filter((p) => !built.some((b) => b.id === p.id))

  const edit = (next: Item[]) => {
    setBuilt(next)
    if (state === 'wrong') setState('open')
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= built.length || from === to) return
    const next = built.slice()
    next.splice(to, 0, next.splice(from, 1)[0])
    edit(next)
  }

  const check = () => {
    const ok = checkParsons(a.lines, built.map((b) => b.text))
    onResult(ok)
    setState(ok ? 'right' : 'wrong')
  }

  return (
    <div>
      <p className="question"><Rich text={a.prompt} /></p>
      <div className="parsons">
        <div>
          <h4>Available lines</h4>
          <ul className="plist" data-testid="pool" aria-label="Available lines">
            {unused.length === 0 && <li className="muted small">All lines used.</li>}
            {unused.map((it) => (
              <li key={it.id}>
                <button className="pline" disabled={locked} onClick={() => edit([...built, it])} data-testid="pool-item" title="Add to your solution">
                  <code>{it.text}</code>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Your solution</h4>
          <ol className="plist solution" data-testid="built" aria-label="Your solution">
            {built.length === 0 && <li className="muted small">Click lines to add them here, then reorder.</li>}
            {built.map((it, i) => (
              <li key={it.id} draggable={!locked} onDragStart={() => setDragFrom(i)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragFrom !== null) move(dragFrom, i); setDragFrom(null) }} data-testid="built-item">
                <button className="pline" disabled={locked} onClick={() => edit(built.filter((b) => b.id !== it.id))} title="Remove from your solution">
                  <code>{it.text}</code>
                </button>
                {!locked && (
                  <span className="moves">
                    <button className="ghost mini" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button className="ghost mini" onClick={() => move(i, i + 1)} disabled={i === built.length - 1} aria-label="Move down">↓</button>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
      {a.distractors.length > 0 && !locked && <p className="muted small">Some lines do not belong. Leave them out.</p>}
      {!locked && (
        <div className="row">
          <button onClick={check} disabled={built.length === 0} data-testid="check">Check</button>
          <button className="ghost" onClick={() => edit([])} disabled={built.length === 0}>Clear</button>
        </div>
      )}
      {state === 'wrong' && <Feedback kind="bad">Not quite. Check the order, indentation and any extra lines.</Feedback>}
      {state === 'right' && <Feedback kind="good"><strong>Correct!</strong> <Rich text={a.explanation} /></Feedback>}
    </div>
  )
}
