import { currentStreak } from '../game/streak'
import { useProgress } from '../game/store'
import { levelProgress, levelTitle } from '../game/xp'
import { href, type Route } from '../router'
import { useToday } from './useToday'

export default function Header({ route }: { route: Route }) {
  const p = useProgress()
  const lv = levelProgress(p.xp)
  const today = useToday()
  const streak = currentStreak(p.streak, today)
  const nav = [
    { to: '/', label: 'Map', on: route.name === 'map' || route.name === 'region' || route.name === 'lesson' || route.name === 'boss' },
    { to: '/profile', label: 'Profile', on: route.name === 'profile' },
    { to: '/settings', label: 'Settings', on: route.name === 'settings' },
  ]
  return (
    <header className="topbar">
      <a className="brand" href={href('/')}>🐍 <span>Python Lab</span></a>
      <div className="stats" aria-label="Your progress">
        <div className="level" title={`${lv.into} / ${lv.span} XP to the next level`}>
          <span className="lv" data-testid="level">Lv {lv.level} · {levelTitle(lv.level)}</span>
          <span
            className="bar" role="progressbar" aria-label="XP to next level"
            aria-valuemin={0} aria-valuemax={lv.span} aria-valuenow={lv.into}
          >
            <span style={{ width: `${Math.round(lv.fraction * 100)}%` }} />
          </span>
        </div>
        <span className="chip" data-testid="xp">⭐ {p.xp} XP</span>
        <span className="chip" data-testid="streak" title="Days in a row">🔥 {streak}</span>
      </div>
      <nav>
        {nav.map((n) => (
          <a key={n.to} href={href(n.to)} aria-current={n.on ? 'page' : undefined}>{n.label}</a>
        ))}
      </nav>
    </header>
  )
}
