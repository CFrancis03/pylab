import { getRegion, playableMetas, regionMetas } from '../content'
import { countDone, gateRegion, isUnlocked, regionActivityIds } from '../game/regions'
import { useProgress } from '../game/store'
import { href } from '../router'
import NotFound from './NotFound'

export default function RegionPage({ id }: { id: string }) {
  const p = useProgress()
  const index = regionMetas.findIndex((m) => m.id === id)
  if (index < 0) return <NotFound />
  const meta = regionMetas[index]
  const content = getRegion(id)
  const unlocked = isUnlocked(p, playableMetas, index, p.settings.freeRoam)
  const gate = gateRegion(playableMetas, index)
  const prev = gate && regionMetas.find((m) => m.id === gate.id)
  const boss = p.bosses[id]

  return (
    <main className="page">
      <a className="back" href={href('/')}>← Map</a>
      <header className="region-head">
        <span className="big-emoji" aria-hidden>{meta.emoji}</span>
        <div>
          <h1>{meta.name}</h1>
          <p className="muted">{meta.lectures.length > 1 ? 'Lectures' : 'Lecture'} {meta.lectures.join(' & ')}</p>
        </div>
      </header>
      <p className="lead">{meta.blurb}</p>

      {!content && (
        <div className="card note-card" data-testid="coming-soon">
          <strong>🚧 This region is still being built.</strong>
          <p>Its lessons, games and boss battle will appear here as the course material is turned into quests.</p>
        </div>
      )}

      {content && !unlocked && (
        <div className="card note-card" data-testid="locked">
          <strong>🔒 Locked.</strong>
          <p>
            Defeat the boss of <a href={href(`/region/${prev?.id}`)}>{prev?.name}</a> to open this region,
            or turn on <a href={href('/settings')}>free roam</a> in settings.
          </p>
        </div>
      )}

      {content && unlocked && (
        <>
          <h2>Lessons</h2>
          <ul className="cards">
            {content.lessons.map((l, i) => {
              const { done, total } = countDone(p, l.activities.map((a) => a.id))
              const complete = done === total
              return (
                <li key={l.id}>
                  <a className={`card lesson-card${complete ? ' is-done' : ''}`} href={href(`/region/${id}/lesson/${l.id}`)} data-testid={`lesson-${l.id}`}>
                    <span className="num">{complete ? '✓' : i + 1}</span>
                    <span className="grow">
                      <strong>{l.title}</strong>
                      <span className="muted">{l.blurb}</span>
                    </span>
                    <span className="count">{done}/{total}</span>
                  </a>
                </li>
              )
            })}
          </ul>

          <h2>Boss battle</h2>
          <div className={`card boss-card${boss?.passed ? ' is-done' : ''}`} data-testid="boss">
            <span className="num">⚔️</span>
            <span className="grow">
              <strong>{content.boss.title}</strong>
              <span className="muted">
                {content.boss.questions.length} quiz question{content.boss.questions.length === 1 ? '' : 's'} + 1 coding challenge
                {boss ? ` · best ${Math.round(boss.best * 100)}%${boss.passed ? ' · defeated' : ''}` : ''}
              </span>
            </span>
            <a className="btn" href={href(`/region/${id}/boss`)} data-testid="fight">{boss?.passed ? 'Fight again' : 'Fight!'}</a>
          </div>
          <p className="muted small">
            {regionActivityIds(content).length} activities in this region.
          </p>
        </>
      )}
    </main>
  )
}
