import { useState } from 'react'
import { Rich } from '../ui/Md'
import type { PredictOutput as PO } from '../content/schema'
import Feedback from './Feedback'
import { normalizeOutput } from './logic'

export default function PredictOutput({ a, onResult }: { a: PO; onResult: (correct: boolean) => void }) {
  const [guess, setGuess] = useState('')
  const [state, setState] = useState<'open' | 'wrong' | 'right' | 'revealed'>('open')
  const locked = state === 'right' || state === 'revealed'

  const check = () => {
    const ok = normalizeOutput(guess) === normalizeOutput(a.expected)
    onResult(ok)
    setState(ok ? 'right' : 'wrong')
  }

  return (
    <div>
      <p className="question"><Rich text={a.prompt} /></p>
      <pre className="code"><code>{a.code}</code></pre>
      <label className="field">
        <span className="muted small">Your answer (exactly what is printed, one line per line)</span>
        <textarea value={guess} rows={Math.max(2, a.expected.split('\n').length)} disabled={locked} spellCheck={false}
          onChange={(e) => { setGuess(e.target.value); if (state === 'wrong') setState('open') }} data-testid="guess" />
      </label>
      {!locked && (
        <div className="row">
          <button onClick={check} disabled={!guess.trim()} data-testid="check">Check</button>
          {state === 'wrong' && <button className="ghost" onClick={() => setState('revealed')} data-testid="reveal">Show the answer</button>}
        </div>
      )}
      {state === 'wrong' && <Feedback kind="bad">That is not what Python prints. Look at it again.</Feedback>}
      {state === 'right' && <Feedback kind="good"><strong>Correct!</strong> <Rich text={a.explanation} /></Feedback>}
      {state === 'revealed' && (
        <Feedback kind="info">
          <strong>It prints:</strong>
          <pre className="code"><code>{a.expected}</code></pre>
          <Rich text={a.explanation} />
        </Feedback>
      )}
    </div>
  )
}
