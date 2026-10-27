import { useState } from 'react'
import { Rich } from '../ui/Md'
import type { Mcq as McqT } from '../content/schema'
import { isMcqCorrect } from './logic'
import Feedback from './Feedback'

interface Props {
  q: McqT
  /** Lessons allow retries; boss battles lock in the first answer and reveal it. */
  retry: boolean
  onResult: (correct: boolean) => void
}

export default function Mcq({ q, retry, onResult }: Props) {
  const multi = Array.isArray(q.answer)
  const [picked, setPicked] = useState<number[]>([])
  const [state, setState] = useState<'open' | 'wrong' | 'right' | 'revealed'>('open')
  const locked = state === 'right' || state === 'revealed'
  const answers = Array.isArray(q.answer) ? q.answer : [q.answer]

  const toggle = (i: number) => {
    if (locked) return
    setState('open')
    setPicked((p) => (multi ? (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]) : [i]))
  }

  const check = () => {
    const ok = isMcqCorrect(q.answer, picked)
    onResult(ok)
    setState(ok ? 'right' : retry ? 'wrong' : 'revealed')
  }

  return (
    <div className="mcq">
      <p className="question"><Rich text={q.question} /></p>
      {q.code && <pre className="code"><code>{q.code}</code></pre>}
      {multi && <p className="muted small">Select all that apply.</p>}
      <div className="options" role={multi ? 'group' : 'radiogroup'} aria-label="Answer options">
        {q.options.map((o, i) => {
          const chosen = picked.includes(i)
          const reveal = locked && answers.includes(i)
          return (
            <label key={i} className={`option${chosen ? ' chosen' : ''}${reveal ? ' is-answer' : ''}${state === 'revealed' && chosen && !answers.includes(i) ? ' is-miss' : ''}`}>
              <input type={multi ? 'checkbox' : 'radio'} name={q.id} checked={chosen} disabled={locked} onChange={() => toggle(i)} data-testid={`opt-${i}`} />
              <span><Rich text={o} /></span>
            </label>
          )
        })}
      </div>
      {!locked && <button onClick={check} disabled={picked.length === 0} data-testid="check">Check</button>}
      {state === 'wrong' && (
        <Feedback kind="bad">
          Not quite. Try again.{' '}
          <button className="linklike" onClick={() => setState('revealed')} data-testid="reveal">Show the answer</button>
        </Feedback>
      )}
      {state === 'right' && <Feedback kind="good"><strong>Correct!</strong> <Rich text={q.explanation} /></Feedback>}
      {state === 'revealed' && <Feedback kind="info"><strong>Answer shown.</strong> <Rich text={q.explanation} /></Feedback>}
    </div>
  )
}
