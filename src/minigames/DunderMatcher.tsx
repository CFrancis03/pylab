import { useState } from 'react'
import LevelTabs from './LevelTabs'
import { DUNDER_ROUNDS, shuffled, type DunderPair } from './dunders'
import { useSolved } from './useSolved'

function Round({ pairs, cleared, onSolved }: { pairs: DunderPair[]; cleared: boolean; onSolved: () => void }) {
  const [left, setLeft] = useState<number | null>(null)
  const [right, setRight] = useState<number | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [flash, setFlash] = useState<'bad' | null>(null)
  const rightOrder = shuffled(pairs.map((_, i) => i))

  const attempt = (l: number, r: number) => {
    if (l === r) {
      const next = [...matched, l]
      setMatched(next)
      if (next.length === pairs.length) onSolved()
    } else {
      setMistakes((m) => m + 1)
      setFlash('bad')
      window.setTimeout(() => setFlash(null), 500)
    }
    setLeft(null)
    setRight(null)
  }
  const pickLeft = (i: number) => {
    if (matched.includes(i)) return
    if (right !== null) attempt(i, right)
    else setLeft(left === i ? null : i)
  }
  const pickRight = (i: number) => {
    if (matched.includes(i)) return
    if (left !== null) attempt(left, i)
    else setRight(right === i ? null : i)
  }

  return (
    <div data-testid="dunder-round" data-solved={cleared ? 'true' : 'false'}>
      <p>Match each piece of Python syntax with the special method it calls. Click one on each side.</p>
      <div className={`dunder-grid${flash ? ' shake' : ''}`}>
        <ul className="dunder-col" aria-label="Syntax">
          {pairs.map((p, i) => (
            <li key={p.expr}>
              <button className={`dunder${left === i ? ' sel' : ''}${matched.includes(i) ? ' ok' : ''}`} disabled={matched.includes(i)} aria-pressed={left === i} onClick={() => pickLeft(i)} data-testid={`expr-${i}`}>
                <code>{p.expr}</code>
              </button>
            </li>
          ))}
        </ul>
        <ul className="dunder-col" aria-label="Special methods">
          {rightOrder.map((i) => (
            <li key={pairs[i].dunder}>
              <button className={`dunder${right === i ? ' sel' : ''}${matched.includes(i) ? ' ok' : ''}`} disabled={matched.includes(i)} aria-pressed={right === i} onClick={() => pickRight(i)} data-testid={`dunder-${i}`}>
                <code>{pairs[i].dunder}</code>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="viz-note" role="status" data-testid="dunder-status">
        {matched.length === pairs.length ? `✓ All ${pairs.length} matched with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.` : flash ? '✗ Not a pair. Try again.' : `${matched.length}/${pairs.length} matched. Mistakes: ${mistakes}`}
      </p>
    </div>
  )
}

export default function DunderMatcher({ onFinished }: { onFinished: () => void }) {
  const [idx, setIdx] = useState(0)
  const { solved, mark } = useSolved(DUNDER_ROUNDS.map((r) => r.id), onFinished)
  const round = DUNDER_ROUNDS[idx]
  return (
    <div className="viz game" data-testid="game-dunder-matcher">
      <LevelTabs levels={DUNDER_ROUNDS} active={idx} solved={solved} onPick={setIdx} label="Rounds" />
      <Round key={round.id} pairs={round.pairs} cleared={solved.includes(round.id)} onSolved={() => mark(round.id)} />
    </div>
  )
}
