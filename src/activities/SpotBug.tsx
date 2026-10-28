import { useState } from 'react'
import { Rich } from '../ui/Md'
import type { SpotBug as SB } from '../content/schema'
import Feedback from './Feedback'

export default function SpotBug({ a, onResult }: { a: SB; onResult: (correct: boolean) => void }) {
  const [misses, setMisses] = useState<number[]>([])
  const [state, setState] = useState<'open' | 'right' | 'revealed'>('open')
  const [found, setFound] = useState<number | null>(null)
  const locked = state !== 'open'

  const pick = (n: number) => {
    if (locked || misses.includes(n)) return
    const ok = a.bugLines.includes(n)
    onResult(ok)
    if (ok) {
      setFound(n)
      setState('right')
    } else setMisses((m) => [...m, n])
  }

  return (
    <div>
      <p className="question"><Rich text={a.prompt} /></p>
      <ol className="bug-lines" data-testid="bug-lines">
        {a.code.split('\n').map((line, i) => {
          const n = i + 1
          const cls = [found === n || (state === 'revealed' && a.bugLines.includes(n)) ? 'is-bug' : '', misses.includes(n) ? 'is-miss' : ''].join(' ')
          return (
            <li key={n}>
              <button className={`bug-line ${cls}`} onClick={() => pick(n)} disabled={locked || misses.includes(n)} data-testid={`line-${n}`}>
                <span className="ln">{n}</span>
                <code>{line || ' '}</code>
              </button>
            </li>
          )
        })}
      </ol>
      {state === 'open' && misses.length > 0 && (
        <Feedback kind="bad">
          Line {misses[misses.length - 1]} is fine. Keep looking.{' '}
          <button className="linklike" onClick={() => setState('revealed')} data-testid="reveal">Show the bug</button>
        </Feedback>
      )}
      {state === 'right' && <Feedback kind="good"><strong>Found it!</strong> <Rich text={a.explanation} /></Feedback>}
      {state === 'revealed' && <Feedback kind="info"><strong>The bug is highlighted.</strong> <Rich text={a.explanation} /></Feedback>}
    </div>
  )
}
