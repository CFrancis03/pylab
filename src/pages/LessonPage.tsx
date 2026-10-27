import { getRegion } from '../content'
import type { Activity } from '../content/schema'
import { countDone } from '../game/regions'
import { useProgress } from '../game/store'
import { href } from '../router'
import ActivityView from '../activities/ActivityView'
import { TYPE_LABEL } from '../activities/labels'
import NotFound from './NotFound'

function ActivityCard({ a, done }: { a: Activity; done: boolean }) {
  return (
    <article className={`card activity${done ? ' is-done' : ''}`} data-testid={`activity-${a.id}`} data-done={done}>
      <header className="activity-head">
        <span className="tag">{TYPE_LABEL[a.type]}</span>
        <span className="xp-tag">{done ? '✓ done' : `+${a.xp} XP`}</span>
      </header>
      <ActivityView a={a} done={done} />
    </article>
  )
}

export default function LessonPage({ id, lessonId }: { id: string; lessonId: string }) {
  const p = useProgress()
  const region = getRegion(id)
  const index = region?.lessons.findIndex((l) => l.id === lessonId) ?? -1
  if (!region || index < 0) return <NotFound />
  const lesson = region.lessons[index]
  const next = region.lessons[index + 1]
  const { done, total } = countDone(p, lesson.activities.map((a) => a.id))
  const complete = done === total

  return (
    <main className="page narrow">
      <a className="back" href={href(`/region/${id}`)}>← {region.name}</a>
      <h1>{lesson.title}</h1>
      <p className="lead">{lesson.blurb}</p>
      <div className="lesson-progress" data-testid="lesson-progress">
        <span className="bar" role="progressbar" aria-label="Lesson progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <span style={{ width: `${(done / total) * 100}%` }} />
        </span>
        <span className="muted">{done}/{total}</span>
      </div>

      {lesson.activities.map((a) => <ActivityCard key={a.id} a={a} done={a.id in p.completed} />)}

      {complete && (
        <div className="card win" data-testid="lesson-complete">
          <strong>🎉 Lesson complete!</strong>
          <p>
            {next ? <a href={href(`/region/${id}/lesson/${next.id}`)}>Next lesson: {next.title} →</a>
              : <a href={href(`/region/${id}`)}>Back to {region.name} for the boss battle →</a>}
          </p>
        </div>
      )}
    </main>
  )
}
