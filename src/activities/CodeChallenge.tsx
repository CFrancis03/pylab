import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { CodeChallenge as CC } from '../content/schema'
import { runPython, warmUp } from '../engine/runner'
import type { RunResult } from '../engine/types'
import { xpAfterHints } from '../game/xp'
import { useEngineStatus } from '../ui/useEngineStatus'
import Feedback from './Feedback'
import Md, { Rich } from '../ui/Md'
import RunOutput from './RunOutput'

// CodeMirror is large and only needed where there is something to type, so it loads on demand.
const CodeEditor = lazy(() => import('../ui/CodeEditor'))

interface Props {
  a: CC
  /** Called on every Submit. `xp` is the base XP reduced by hints used. */
  onSubmit: (passed: boolean, xp: number) => void
  /** Hints cost XP in lessons; boss battles do not offer them. */
  allowHints?: boolean
  /** Boss battles end after the first pass; lessons let you keep practising. */
  lockOnPass?: boolean
}

const STATUS_TEXT = { idle: '', loading: 'Loading Python…', ready: '', running: 'Running…', restarting: 'Restarting Python…' } as const

export default function CodeChallenge({ a, onSubmit, allowHints = true, lockOnPass = false }: Props) {
  const [code, setCode] = useState(a.starter)
  const [result, setResult] = useState<RunResult | null>(null)
  const [graded, setGraded] = useState(false)
  const [hints, setHints] = useState(0)
  const [passed, setPassed] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const status = useEngineStatus()
  const busy = status === 'running'

  useEffect(() => {
    void warmUp().catch(() => {})
  }, [])

  const run = async (submit: boolean) => {
    if (busy) return
    abort.current = new AbortController()
    setResult(null)
    setGraded(submit)
    const r = await runPython(
      { code, tests: submit ? a.tests : undefined, files: a.files },
      { timeoutMs: a.timeoutMs, signal: abort.current.signal },
    )
    setResult(r)
    if (submit) {
      const ok = r.ok && !!r.results && r.results.length > 0
      if (ok) setPassed(true)
      onSubmit(ok, xpAfterHints(a.xp, hints))
    }
  }

  const locked = lockOnPass && passed

  return (
    <div className="challenge">
      <Md text={a.prompt} />
      <Suspense fallback={<div className="editor-loading muted" role="status">Loading the code editor…</div>}>
        <CodeEditor value={code} onChange={setCode} onRun={() => void run(true)} label={`Code editor for ${a.title}`} readOnly={locked} />
      </Suspense>
      <div className="row">
        <button className="ghost" onClick={() => void run(false)} disabled={busy || locked} data-testid="run">▶ Run</button>
        <button onClick={() => void run(true)} disabled={busy || locked} data-testid="submit">✔ Submit</button>
        {busy && <button className="ghost" onClick={() => abort.current?.abort()} data-testid="stop">■ Stop</button>}
        <button className="ghost" onClick={() => { setCode(a.starter); setResult(null) }} disabled={busy || locked}>Reset</button>
        <span className="muted small" data-testid="engine-status">{STATUS_TEXT[status]}</span>
      </div>
      <p className="muted small">Ctrl/Cmd+Enter submits. Press Esc, then Tab, to leave the editor. “Run” just runs your code; “Submit” also runs the hidden checks.</p>

      {allowHints && a.hints.length > 0 && !locked && (
        <div className="hints">
          {a.hints.slice(0, hints).map((h, i) => <Feedback key={i} kind="info"><strong>Hint {i + 1}:</strong> <Rich text={h} /></Feedback>)}
          {hints < a.hints.length && (
            <button className="ghost" onClick={() => setHints((h) => h + 1)} data-testid="hint">
              💡 Hint {hints + 1} of {a.hints.length} (costs 25% of the XP)
            </button>
          )}
        </div>
      )}

      {result && <RunOutput result={result} graded={graded} />}
      {result && graded && (result.ok
        ? <Feedback kind="good"><strong>All checks passed!</strong></Feedback>
        : <Feedback kind="bad">Not yet. Read the failed checks above and try again.</Feedback>)}
    </div>
  )
}
