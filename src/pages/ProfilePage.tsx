import { BADGES } from '../game/badges'
import { currentStreak } from '../game/streak'
import { useProgress } from '../game/store'
import { levelProgress, levelTitle } from '../game/xp'
import { useToday } from '../ui/useToday'

export default function ProfilePage() {
  const p = useProgress()
  const lv = levelProgress(p.xp)
  const today = useToday()
  const topics = Object.entries(p.topics)
    .map(([name, t]) => ({ name, ...t, total: t.right + t.wrong }))
    .sort((a, b) => a.right / a.total - b.right / b.total || b.total - a.total)

  return (
    <main className="page">
      <h1>Your profile</h1>
      <section className="stat-grid">
        <div className="card stat"><span className="big">Lv {lv.level}</span><span>{levelTitle(lv.level)}</span></div>
        <div className="card stat"><span className="big">{p.xp}</span><span>total XP</span></div>
        <div className="card stat"><span className="big">🔥 {currentStreak(p.streak, today)}</span><span>day streak (best {p.streak.best})</span></div>
        <div className="card stat"><span className="big">{Object.keys(p.completed).length}</span><span>activities done</span></div>
      </section>

      <h2>Badges <span className="muted small">{Object.keys(p.badges).length}/{BADGES.length}</span></h2>
      <ul className="badges">
        {BADGES.map((b) => {
          const got = b.id in p.badges
          return (
            <li key={b.id} className={`card badge${got ? '' : ' is-locked'}`} data-testid={`badge-${b.id}`} data-earned={got}>
              <span className="badge-emoji" aria-hidden>{got ? b.emoji : '❔'}</span>
              <strong>{b.name}</strong>
              <span className="muted small">{b.desc}</span>
            </li>
          )
        })}
      </ul>

      <h2>Topic accuracy</h2>
      {topics.length === 0 ? (
        <p className="muted">Answer some questions and your weakest topics will show up here first.</p>
      ) : (
        <ul className="topics">
          {topics.map((t) => (
            <li key={t.name}>
              <span className="topic-name">{t.name}</span>
              <span className="bar" role="img" aria-label={`${t.right} right, ${t.wrong} wrong`}>
                <span style={{ width: `${(t.right / t.total) * 100}%` }} />
              </span>
              <span className="muted small">{t.right}/{t.total}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
