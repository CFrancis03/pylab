import { useEffect, useRef, useState } from 'react'
import Mcq from '../activities/Mcq'
import PredictOutput from '../activities/PredictOutput'
import SpotBug from '../activities/SpotBug'
import { practiceAnswer } from '../game/store'
import type { Answer } from './exam'
import type { QuizItem } from './items'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Seconds left until `deadline` (ms), or null when untimed. Calls `onExpire` once when it hits zero. */
function useRemaining(deadline: number | null, onExpire: () => void): number | null {
  const [now, setNow] = useState(() => Date.now())
  const expire = useRef(onExpire)
  const fired = useRef(false)
  useEffect(() => {
    expire.current = onExpire
  })
  useEffect(() => {
    if (deadline === null) return
    const t = window.setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= deadline && !fired.current) {
        fired.current = true
        expire.current()
      }
    }, 500)
    return () => window.clearInterval(t)
  }, [deadline])
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000))
}

interface Props {
  items: QuizItem[]
  /** Epoch ms when time runs out, or null for no limit. */
  deadline: number | null
  onFinish: (answers: Answer[], timedOut: boolean) => void
}

/**
 * Asks the questions one at a time. Only the FIRST answer to each question counts and is recorded
 * (a wrong guess cannot be taken back), so the score reflects what you knew cold.
 */
export default function QuizRunner({ items, deadline, onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const remaining = useRemaining(deadline, () => onFinish(answers, true))
  const item = items[index]
  const answered = answers.length > index
  const last = index === items.length - 1

  const record = (correct: boolean) => {
    if (answers.length > index) return
    const a: Answer = { id: item.id, topic: item.topic, correct }
    setAnswers([...answers, a])
    practiceAnswer(a)
  }
  const advance = (finalAnswers: Answer[]) => {
    if (last) onFinish(finalAnswers, false)
    else setIndex(index + 1)
  }
  const skip = () => {
    const a: Answer = { id: item.id, topic: item.topic, correct: false }
    const next = [...answers, a]
    setAnswers(next)
    practiceAnswer(a)
    advance(next)
  }

  const q = item.activity
  return (
    <div className="quiz" data-testid="quiz">
      <div className="quiz-head">
        <span data-testid="quiz-progress">Question {index + 1} of {items.length}</span>
        <span className="muted small">{item.regionName}</span>
        {remaining !== null && <span className={`chip${remaining < 60 ? ' danger-chip' : ''}`} data-testid="quiz-timer" role="timer">⏱ {clock(remaining)}</span>}
      </div>
      <span className="bar" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={index + (answered ? 1 : 0)}>
        <span style={{ width: `${((index + (answered ? 1 : 0)) / items.length) * 100}%` }} />
      </span>
      <div className="card quiz-card" data-testid="quiz-question" data-item-id={item.id} data-type={q.type}>
        {q.type === 'mcq' && <Mcq key={item.id} q={q} retry={false} onResult={record} />}
        {q.type === 'predict-output' && <PredictOutput key={item.id} a={q} onResult={record} />}
        {q.type === 'spot-bug' && <SpotBug key={item.id} a={q} onResult={record} />}
      </div>
      <div className="row">
        {answered ? (
          <button onClick={() => advance(answers)} data-testid={last ? 'quiz-finish' : 'quiz-next'}>{last ? 'Finish' : 'Next →'}</button>
        ) : (
          <button className="ghost" onClick={skip} data-testid="quiz-skip">Skip (counts as missed)</button>
        )}
      </div>
    </div>
  )
}
