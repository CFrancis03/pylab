import type { ReactNode } from 'react'
import { href } from '../router'
import { Rich } from '../ui/Md'
import { scoreExam, topicBreakdown, type Answer } from './exam'
import { itemHref, itemTitle, type QuizItem } from './items'
import { prettyTopic } from './topics'

interface Props {
  items: QuizItem[]
  answers: Answer[]
  timedOut?: boolean
  seconds?: number
  /** Buttons such as "Practice again". */
  children?: ReactNode
}

/** Score, a per-topic breakdown, and every missed question with its explanation. */
export default function QuizResults({ items, answers, timedOut, seconds, children }: Props) {
  const { correct, total, score } = scoreExam(answers, items.length)
  const right = new Set(answers.filter((a) => a.correct).map((a) => a.id))
  const missed = items.filter((i) => !right.has(i.id))
  const topics = topicBreakdown(items, answers)
  const pct = Math.round(score * 100)
  return (
    <div data-testid="quiz-results">
      <div className="card win">
        <h2 data-testid="quiz-score">{pct}%</h2>
        <p>
          {correct} of {total} correct{seconds !== undefined ? ` in ${Math.floor(seconds / 60)}m ${seconds % 60}s` : ''}.
          {timedOut && ' Time ran out, and unanswered questions count as missed.'}
        </p>
        <p className="muted">{pct >= 80 ? 'Strong. You are exam-ready on this material.' : pct >= 60 ? 'Getting there. Work through the missed questions below.' : 'Plenty to gain here. Revisit the lessons linked below, then try again.'}</p>
      </div>

      <h3>By topic</h3>
      <ul className="topics">
        {topics.map((t) => (
          <li key={t.topic}>
            <span className="topic-name">{prettyTopic(t.topic)}</span>
            <span className="bar" role="img" aria-label={`${t.right} right, ${t.wrong} wrong`}>
              <span style={{ width: `${(t.right / (t.right + t.wrong)) * 100}%` }} />
            </span>
            <span className="muted small">{t.right}/{t.right + t.wrong}</span>
          </li>
        ))}
      </ul>

      {missed.length > 0 && (
        <>
          <h3>Missed ({missed.length})</h3>
          <ul className="missed" data-testid="missed-list">
            {missed.map((i) => (
              <li key={i.id} className="card">
                <p><strong><Rich text={itemTitle(i)} /></strong></p>
                <p className="small"><Rich text={i.activity.explanation} /></p>
                <a className="small" href={href(itemHref(i))}>Open {i.regionName}{i.lessonId ? ' lesson' : ''} →</a>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="row">{children}</div>
    </div>
  )
}
