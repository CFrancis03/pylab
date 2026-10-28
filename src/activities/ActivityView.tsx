import { Suspense } from 'react'
import type { Activity } from '../content/schema'
import { completeActivity } from '../game/store'
import Md from '../ui/Md'
import CodeChallenge from './CodeChallenge'
import Flashcards from './Flashcards'
import Mcq from './Mcq'
import Parsons from './Parsons'
import PredictOutput from './PredictOutput'
import { TYPE_LABEL } from './labels'
import SpotBug from './SpotBug'
import ScenarioVisualizer from '../visualizers/ScenarioVisualizer'
import { EXPLORERS, IMPLEMENTED } from '../visualizers/registry'
import SliceExplorer from '../visualizers/SliceExplorer'
import { MINIGAME_VIEWS } from '../minigames'

/** Renders one lesson activity and reports results to the progress store. */
export default function ActivityView({ a, done }: { a: Activity; done: boolean }) {
  const report = (correct: boolean, xp = a.xp) => completeActivity({ id: a.id, topic: a.topic, xp, correct })

  switch (a.type) {
    case 'concept':
      return (
        <>
          <h2 className="activity-title">{a.title}</h2>
          <Md text={a.body} />
          {a.code && <pre className="code" tabIndex={0}><code>{a.code}</code></pre>}
          {!done && <button onClick={() => report(true)}>Got it</button>}
        </>
      )
    case 'mcq':
      return <Mcq q={a} retry onResult={report} />
    case 'predict-output':
      return <PredictOutput a={a} onResult={report} />
    case 'spot-bug':
      return <SpotBug a={a} onResult={report} />
    case 'parsons':
      return <Parsons a={a} onResult={report} />
    case 'flashcards':
      return (
        <>
          <h2 className="activity-title">{a.title}</h2>
          <Flashcards a={a} onFinished={() => report(true)} />
        </>
      )
    case 'code-challenge':
      return (
        <>
          <h2 className="activity-title">{a.title}</h2>
          <CodeChallenge a={a} onSubmit={(ok, xp) => report(ok, xp)} />
        </>
      )
    case 'visualizer': {
      const scenarios = Array.isArray(a.params.scenarios) ? a.params.scenarios.map(String) : []
      if (EXPLORERS[a.name]) {
        return (
          <>
            <h2 className="activity-title">{a.title}</h2>
            <SliceExplorer onFinished={() => report(true)} />
          </>
        )
      }
      if (IMPLEMENTED[a.name]) {
        return (
          <>
            <h2 className="activity-title">{a.title}</h2>
            <ScenarioVisualizer scenarios={scenarios} onFinished={() => report(true)} />
          </>
        )
      }
      return <Placeholder a={a} done={done} report={report} />
    }
    case 'minigame': {
      const Game = MINIGAME_VIEWS[a.name]
      if (!Game) return <Placeholder a={a} done={done} report={report} />
      return (
        <>
          <h2 className="activity-title">{a.title}</h2>
          <Suspense fallback={<p className="muted" role="status">Loading the game…</p>}>
            <Game onFinished={() => report(true)} />
          </Suspense>
        </>
      )
    }
    default:
      return <Placeholder a={a} done={done} report={report} />
  }
}

function Placeholder({ a, done, report }: { a: Activity; done: boolean; report: (c: boolean) => void }) {
  const title = 'title' in a ? a.title : TYPE_LABEL[a.type]
  return (
    <>
      <h3>{title}</h3>
      <p className="muted">This interactive {TYPE_LABEL[a.type].toLowerCase()} is built in a later stage.</p>
      {import.meta.env.DEV && !done && (
        <button className="ghost" data-testid={`dev-complete-${a.id}`} onClick={() => report(true)}>Mark complete (dev only)</button>
      )}
    </>
  )
}
