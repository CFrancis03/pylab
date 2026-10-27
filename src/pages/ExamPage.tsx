import { useState } from 'react'
import { regions } from '../content'
import { finishExam, useProgress } from '../game/store'
import { href } from '../router'
import { ITEMS } from '../study/data'
import { EXAM_MINUTES, EXAM_SIZES, pickExam, scoreExam, suggestedMinutes, type Answer } from '../study/exam'
import type { QuizItem } from '../study/items'
import QuizResults from '../study/QuizResults'
import QuizRunner from '../study/QuizRunner'

type Phase =
  | { name: 'setup' }
  | { name: 'run'; items: QuizItem[]; startedAt: number; deadline: number | null; regionIds: string[] }
  | { name: 'done'; items: QuizItem[]; answers: Answer[]; timedOut: boolean; seconds: number }

export default function ExamPage() {
  const p = useProgress()
  const [phase, setPhase] = useState<Phase>({ name: 'setup' })
  const [chosen, setChosen] = useState<string[]>(() => regions.map((r) => r.id))
  const [size, setSize] = useState<number>(20)
  const [minutes, setMinutes] = useState<number>(suggestedMinutes(20))
  const available = ITEMS.filter((i) => chosen.includes(i.regionId)).length

  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const pickSize = (n: number) => {
    setSize(n)
    setMinutes(suggestedMinutes(n))
  }

  const start = () => {
    const items = pickExam(ITEMS, chosen, size, Math.random)
    const now = Date.now()
    setPhase({ name: 'run', items, startedAt: now, deadline: minutes > 0 ? now + minutes * 60_000 : null, regionIds: chosen })
  }

  const finish = (run: Extract<Phase, { name: 'run' }>, answers: Answer[], timedOut: boolean) => {
    const seconds = Math.round((Date.now() - run.startedAt) / 1000)
    const { correct, total } = scoreExam(answers, run.items.length)
    finishExam({ correct, total, seconds, regions: run.regionIds })
    setPhase({ name: 'done', items: run.items, answers, timedOut, seconds })
  }

  const recent = [...p.exams].reverse().slice(0, 5)

  return (
    <main className="page narrow">
      <a className="back" href={href('/study')}>← Study</a>
      <h1>Mock exam</h1>

      {phase.name === 'setup' && (
        <>
          <p className="muted">Mixed questions from the regions you choose, with an optional time limit. Each answer is final, and you get the full breakdown at the end.</p>
          <fieldset className="card setup">
            <legend>Regions</legend>
            <div className="row wrap">
              <button className="ghost" onClick={() => setChosen(regions.map((r) => r.id))} data-testid="select-all">All</button>
              <button className="ghost" onClick={() => setChosen([])} data-testid="select-none">None</button>
            </div>
            <div className="check-grid">
              {regions.map((r) => (
                <label key={r.id}>
                  <input type="checkbox" checked={chosen.includes(r.id)} onChange={() => toggle(r.id)} data-testid={`exam-region-${r.id}`} /> {r.emoji} {r.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="card setup">
            <legend>Format</legend>
            <label>
              Questions:{' '}
              <select value={size} onChange={(e) => pickSize(Number(e.target.value))} data-testid="exam-size">
                {EXAM_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>
              Time limit:{' '}
              <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} data-testid="exam-minutes">
                {EXAM_MINUTES.map((m) => <option key={m} value={m}>{m === 0 ? 'Untimed' : `${m} minutes`}</option>)}
              </select>
            </label>
            <p className="muted small" data-testid="exam-available">{Math.min(size, available)} questions will be asked ({available} available in these regions).</p>
            <div className="row"><button onClick={start} disabled={available === 0} data-testid="start-exam">Start exam</button></div>
          </fieldset>

          {recent.length > 0 && (
            <>
              <h2>Recent exams</h2>
              <ul className="exam-history" data-testid="exam-history">
                {recent.map((e) => (
                  <li key={e.at}>
                    <span>{new Date(e.at).toLocaleDateString()}</span>
                    <span className="bar" role="img" aria-label={`${Math.round((e.correct / e.total) * 100)} percent`}><span style={{ width: `${(e.correct / e.total) * 100}%` }} /></span>
                    <strong>{Math.round((e.correct / e.total) * 100)}%</strong>
                    <span className="muted small">{e.correct}/{e.total} · {e.regions.length} region{e.regions.length === 1 ? '' : 's'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {phase.name === 'run' && <QuizRunner items={phase.items} deadline={phase.deadline} onFinish={(answers, timedOut) => finish(phase, answers, timedOut)} />}

      {phase.name === 'done' && (
        <QuizResults items={phase.items} answers={phase.answers} timedOut={phase.timedOut} seconds={phase.seconds}>
          <button onClick={() => setPhase({ name: 'setup' })} data-testid="exam-again">Set up another exam</button>
          <a className="button ghost" href={href('/study/review')}>Practice weak topics</a>
        </QuizResults>
      )}
    </main>
  )
}
