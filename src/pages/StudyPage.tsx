import { regions } from '../content'
import { useProgress } from '../game/store'
import { href } from '../router'
import { useToday } from '../ui/useToday'
import { DECK, HOMES, ITEMS } from '../study/data'
import { waitingCount } from '../study/deck'
import { prettyTopic } from '../study/topics'
import { isStudied, overallAccuracy, troubleCount, weakTopics } from '../study/weakness'

const pct = (x: number) => `${Math.round(x * 100)}%`

export default function StudyPage() {
  const p = useProgress()
  const today = useToday()
  const waiting = waitingCount(DECK, p.cards, today)
  const weak = weakTopics(p, 8)
  const accuracy = overallAccuracy(p)
  const bestExam = p.exams.reduce<number | null>((b, e) => Math.max(b ?? 0, e.correct / e.total), null)
  const studied = ITEMS.filter((i) => isStudied(p, i)).length
  const rows = regions.map((r) => {
    const ids = r.lessons.flatMap((l) => l.activities.map((a) => a.id))
    const done = ids.filter((id) => id in p.completed).length
    return { r, done, total: ids.length, boss: p.bosses[r.id] }
  })

  return (
    <main className="page">
      <h1>Study</h1>
      <p className="muted">Tools for exam prep, built from everything you have played.</p>

      <section className="study-grid" data-testid="study-tiles">
        <a className="card tile" href={href('/study/review')} data-testid="tile-review">
          <span className="tile-emoji" aria-hidden>🎯</span>
          <strong>Review mode</strong>
          <span className="muted small">{weak[0] ? `Weakest: ${prettyTopic(weak[0].topic)} (${pct(weak[0].accuracy)})` : 'Quiz on your weakest topics'}</span>
        </a>
        <a className="card tile" href={href('/study/cards')} data-testid="tile-cards">
          <span className="tile-emoji" aria-hidden>🃏</span>
          <strong>Daily flashcards</strong>
          <span className="muted small" data-testid="tile-cards-count">{waiting === 0 ? 'Nothing due today' : `${waiting} card${waiting === 1 ? '' : 's'} waiting`}</span>
        </a>
        <a className="card tile" href={href('/study/exam')} data-testid="tile-exam">
          <span className="tile-emoji" aria-hidden>⏱️</span>
          <strong>Mock exam</strong>
          <span className="muted small">{bestExam === null ? 'Timed, mixed questions' : `Best score: ${pct(bestExam)}`}</span>
        </a>
        <a className="card tile" href={href('/study/cheatsheet')} data-testid="tile-sheet">
          <span className="tile-emoji" aria-hidden>📄</span>
          <strong>Cheat sheet</strong>
          <span className="muted small">Printable summary of every concept</span>
        </a>
      </section>

      <h2>Dashboard</h2>
      <section className="stat-grid">
        <div className="card stat"><span className="big" data-testid="dash-accuracy">{accuracy === null ? '–' : pct(accuracy)}</span><span>answers correct</span></div>
        <div className="card stat"><span className="big">{studied}</span><span>of {ITEMS.length} questions seen</span></div>
        <div className="card stat"><span className="big">{troubleCount(p)}</span><span>trouble questions</span></div>
        <div className="card stat"><span className="big">{p.exams.length}</span><span>mock exams taken</span></div>
      </section>

      <h3>Progress by region</h3>
      <ul className="region-rows" data-testid="region-progress">
        {rows.map(({ r, done, total, boss }) => (
          <li key={r.id}>
            <a href={href(`/region/${r.id}`)}>{r.emoji} {r.name}</a>
            <span className="bar" role="img" aria-label={`${done} of ${total} activities`}><span style={{ width: `${(done / total) * 100}%` }} /></span>
            <span className="muted small">{done}/{total}</span>
            <span className="small">{boss?.passed ? `⚔️ ${pct(boss.best)}` : boss ? `boss ${pct(boss.best)}` : '·'}</span>
          </li>
        ))}
      </ul>

      <h3>Weakest topics</h3>
      {weak.length === 0 ? (
        <p className="muted">Answer some questions and your weakest topics will appear here, with links back to the lessons that teach them.</p>
      ) : (
        <ul className="topics" data-testid="dash-weak">
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
    </main>
  )
}
