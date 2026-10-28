import { Suspense, useState } from 'react'
import ScenarioVisualizer from '../visualizers/ScenarioVisualizer'
import { MINIGAME_VIEWS } from '../minigames'
import SliceExplorer from '../visualizers/SliceExplorer'
import { SCENARIOS } from '../visualizers/scenarios'
import { TRACES } from '../visualizers/traces'

const groups = (() => {
  const g: Record<string, string[]> = {}
  for (const s of [...Object.values(SCENARIOS), ...Object.values(TRACES)]) (g[s.family] ??= []).push(s.id)
  return g
})()

/** Dev-only: every visualizer family on one page, for playtesting before its region is written. */
export default function VizLab() {
  const [done, setDone] = useState<Record<string, boolean>>({})
  const mark = (k: string) => setDone((d) => ({ ...d, [k]: true }))
  return (
    <main className="page">
      <h1>Visualizer and game lab</h1>
      <p className="muted">Dev only. Each block reports when it would count as complete.</p>
      <section className="card" data-testid="lab-slicing" data-done={done.slicing ? 'true' : 'false'}>
        <h2>slicing</h2>
        <SliceExplorer onFinished={() => mark('slicing')} />
      </section>
      {Object.entries(MINIGAME_VIEWS).map(([name, Game]) => (
        <section key={name} className="card" data-testid={`lab-game-${name}`} data-done={done[`game-${name}`] ? 'true' : 'false'}>
          <h2>mini-game: {name}</h2>
          <Suspense fallback={<p className="muted">Loading…</p>}><Game onFinished={() => mark(`game-${name}`)} /></Suspense>
        </section>
      ))}
      {Object.entries(groups).map(([family, ids]) => (
        <section key={family} className="card" data-testid={`lab-${family}`} data-done={done[family] ? 'true' : 'false'}>
          <h2>{family}</h2>
          <ScenarioVisualizer scenarios={ids} onFinished={() => mark(family)} />
        </section>
      ))}
    </main>
  )
}
