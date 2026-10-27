import { useState } from 'react'
import { useProgress } from '../game/store'
import { href } from '../router'
import type { Answer } from '../study/exam'
import { HOMES, ITEMS } from '../study/data'
import type { QuizItem } from '../study/items'
import QuizResults from '../study/QuizResults'
import QuizRunner from '../study/QuizRunner'
import { prettyTopic } from '../study/topics'
import { isStudied, pickReview, troubleCount, weakTopics, type ReviewScope } from '../study/weakness'

type Phase = { name: 'setup' } | { name: 'run'; items: QuizItem[] } | { name: 'done'; items: QuizItem[]; answers: Answer[] }

const SIZES = [5, 10, 15, 25]

export default function ReviewPage() {
  const p = useProgress()
  const studied = ITEMS.filter((i) => isStudied(p, i)).length
  const [phase, setPhase] = useState<Phase>({ name: 'setup' })
  const [scope, setScope] = useState<ReviewScope>(studied > 0 ? 'studied' : 'all')
  const [size, setSize] = useState(10)
  const weak = weakTopics(p, 6)
  const available = scope === 'studied' ? studied : ITEMS.length

  const start = (items: QuizItem[]) => setPhase({ name: 'run', items })

  return (
    <main className="page narrow">
      <a className="back" href={href('/study')}>← Study</a>
      <h1>Review mode</h1>

      {phase.name === 'setup' && (
        <>
          <p className="muted">A short quiz picked for you: questions from your weakest topics and the ones you have missed come up most often.</p>

          <h2>Your weakest topics</h2>
          {weak.length === 0 ? (
            <p className="muted" data-testid="no-weak">Nothing yet. Play some lessons, or start a review from everything below.</p>
          ) : (
            <ul className="topics" data-testid="weak-topics">
              {weak.map((t) => {
                const home = HOMES.get(t.topic)
                return (
                  <li key={t.topic}>
                    <span className="topic-name">{home ? <a href={href(`/region/${home.regionId}/lesson/${home.lessonId}`)}>{prettyTopic(t.topic)}</a> : prettyTopic(t.topic)}</span>
                    <span className="bar" role="img" aria-label={`${t.right} right, ${t.wrong} wrong`}><span style={{ width: `${(t.right / (t.right + t.wrong)) * 100}%` }} /></span>
                    <span className="muted small">{t.right}/{t.right + t.wrong}</span>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="muted small" data-testid="trouble">{troubleCount(p)} question{troubleCount(p) === 1 ? '' : 's'} you have missed more often than you got right.</p>

          <fieldset className="card setup">
            <legend>Session</legend>
            <label><input type="radio" name="scope" checked={scope === 'studied'} disabled={studied === 0} onChange={() => setScope('studied')} data-testid="scope-studied" /> Questions I have already seen ({studied})</label>
            <label><input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} data-testid="scope-all" /> Everything ({ITEMS.length})</label>
            <label>
              Questions:{' '}
              <select value={size} onChange={(e) => setSize(Number(e.target.value))} data-testid="review-size">
                {SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="row">
              <button onClick={() => start(pickReview(ITEMS, p, size, Math.random, scope))} disabled={available === 0} data-testid="start-review">Start review</button>
            </div>
          </fieldset>
        </>
      )}

      {phase.name === 'run' && <QuizRunner items={phase.items} deadline={null} onFinish={(answers) => setPhase({ name: 'done', items: phase.items, answers })} />}

      {phase.name === 'done' && (
        <QuizResults items={phase.items} answers={phase.answers}>
          <button onClick={() => setPhase({ name: 'setup' })} data-testid="review-again">Another review</button>
          {phase.answers.some((a) => !a.correct) && (
            <button className="ghost" data-testid="retry-missed" onClick={() => start(phase.items.filter((i) => phase.answers.find((a) => a.id === i.id)?.correct !== true))}>Retry the missed ones</button>
          )}
        </QuizResults>
      )}
    </main>
  )
}
