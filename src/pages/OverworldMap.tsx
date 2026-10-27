import { getRegion, playableMetas, regionMetas } from '../content'
import type { RegionMeta } from '../content/schema'
import { nodeState, regionActivityIds, countDone, type NodeState } from '../game/regions'
import { useProgress } from '../game/store'
import { href } from '../router'

const R = 34
const CIRC = 2 * Math.PI * (R + 6)

const STATE_LABEL: Record<NodeState, string> = {
  soon: 'coming soon', locked: 'locked', open: 'ready', started: 'in progress', cleared: 'cleared',
}

function Node({ meta, state, fraction }: { meta: RegionMeta; state: NodeState; fraction: number }) {
  const { x, y } = meta.mapPos
  const label = `${meta.name}, ${STATE_LABEL[state]}`
  return (
    <a href={href(`/region/${meta.id}`)} className={`node node-${state}`} aria-label={label} data-testid={`node-${meta.id}`} data-state={state}>
      <title>{label}</title>
      <circle className="ring-track" cx={x} cy={y} r={R + 6} />
      {fraction > 0 && (
        <circle
          className="ring" cx={x} cy={y} r={R + 6}
          strokeDasharray={`${CIRC * fraction} ${CIRC}`} transform={`rotate(-90 ${x} ${y})`}
        />
      )}
      <circle className="disc" cx={x} cy={y} r={R} />
      <text className="emoji" x={x} y={y + 10} textAnchor="middle">{state === 'locked' ? '🔒' : meta.emoji}</text>
      {state === 'cleared' && <text className="medal" x={x + 28} y={y - 24} textAnchor="middle">⭐</text>}
      <text className="name" x={x} y={y + R + 26} textAnchor="middle">{meta.name}</text>
    </a>
  )
}

export default function OverworldMap() {
  const p = useProgress()
  const states = regionMetas.map((m, i) => {
    const content = getRegion(m.id)
    const state = nodeState(p, playableMetas, i, content)
    const { done, total } = content ? countDone(p, regionActivityIds(content)) : { done: 0, total: 0 }
    return { meta: m, state, fraction: total ? done / total : 0 }
  })
  const path = regionMetas.map((m, i) => `${i ? 'L' : 'M'} ${m.mapPos.x} ${m.mapPos.y}`).join(' ')
  const cleared = states.filter((s) => s.state === 'cleared').length

  return (
    <main className="page">
      <h1>Quest for Pythonia</h1>
      <p className="lead">
        Follow the trail through your course, lecture by lecture. Clear each region's boss to open the next one
        {' '}(or turn on <a href={href('/settings')}>free roam</a> to go anywhere). <strong>{cleared}</strong> of {regionMetas.length} cleared.
      </p>
      <svg className="map" viewBox="0 0 1000 600" role="group" aria-label="Quest map">
        <defs>
          <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--map-a)" />
            <stop offset="1" stopColor="var(--map-b)" />
          </linearGradient>
        </defs>
        <rect width="1000" height="600" rx="24" fill="url(#land)" />
        <path className="trail-bg" d={path} />
        <path className="trail" d={path} />
        {states.map((s) => <Node key={s.meta.id} {...s} />)}
      </svg>
      <ul className="region-list" aria-label="Regions">
        {states.map(({ meta, state }) => (
          <li key={meta.id}>
            <a className={`card region-row region-${state}`} href={href(`/region/${meta.id}`)}>
              <span className="num">{state === 'locked' ? '🔒' : meta.emoji}</span>
              <span className="grow"><strong>{meta.name}</strong><span className="muted small">{STATE_LABEL[state]}</span></span>
            </a>
          </li>
        ))}
      </ul>
      <ul className="legend" aria-label="Legend">
        <li><i className="dot dot-open" /> ready</li>
        <li><i className="dot dot-started" /> in progress</li>
        <li><i className="dot dot-cleared" /> cleared</li>
        <li><i className="dot dot-locked" /> locked</li>
        <li><i className="dot dot-soon" /> coming soon</li>
      </ul>
    </main>
  )
}
