import { useEffect, useRef, useState } from 'react'
import { runPython, warmUp } from '../engine/runner'
import { useEngineStatus } from '../ui/useEngineStatus'
import LevelTabs from './LevelTabs'
import { HUNTER_PY, REGEX_LEVELS, sameMatches, type HunterRun, type RegexLevel } from './regexHunter'
import { useSolved } from './useSolved'

/** Split the text into runs that share the same highlight state. */
function runs(text: string, run: HunterRun | null) {
  const mine = new Array<boolean>(text.length).fill(false)
  const goal = new Array<boolean>(text.length).fill(false)
  for (const [s, e] of run?.user ?? []) for (let i = s; i < e; i++) mine[i] = true
  for (const [s, e] of run?.target ?? []) for (let i = s; i < e; i++) goal[i] = true
  const out: { text: string; mine: boolean; goal: boolean }[] = []
  for (let i = 0; i < text.length; i++) {
    const last = out[out.length - 1]
    if (last && last.mine === mine[i] && last.goal === goal[i]) last.text += text[i]
    else out.push({ text: text[i], mine: mine[i], goal: goal[i] })
  }
  return out
}

interface LevelProps {
  level: RegexLevel
  cleared: boolean
  onSolved: () => void
}

function HunterLevel({ level, cleared, onSolved }: LevelProps) {
  const status = useEngineStatus()
  const [pattern, setPattern] = useState('')
  const [run, setRun] = useState<HunterRun | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const seq = useRef(0)

  useEffect(() => {
    void warmUp()
    return () => window.clearTimeout(timer.current)
  }, [])

  const execute = async (p: string) => {
    const mine = ++seq.current
    setBusy(true)
    const r = await runPython(
      { code: HUNTER_PY, files: { 'pattern.txt': p, 'solution.txt': level.solution, 'text.txt': level.text }, samples: false },
      { timeoutMs: 3000 },
    )
    if (mine !== seq.current) return
    setBusy(false)
    if (r.timedOut) { setProblem('That pattern took too long to run. It may backtrack catastrophically.'); setRun(null); return }
    if (r.error) { setProblem(r.error); setRun(null); return }
    const out = JSON.parse(r.stdout) as HunterRun
    setProblem(out.error ? `re.error: ${out.error}` : null)
    setRun(out)
    if (!out.error && out.user && out.user.length > 0 && sameMatches(out.user, out.target)) onSolved()
  }

  const change = (p: string) => {
    setPattern(p)
    window.clearTimeout(timer.current)
    if (p === '') { seq.current++; setRun(null); setProblem(null); setBusy(false); return }
    timer.current = window.setTimeout(() => void execute(p), 350)
  }

  const user = run?.user ?? []
  const found = level.expected.filter((e) => user.some(([s, en]) => level.text.slice(s, en) === e))
  const exact = !!run && !problem && sameMatches(user, run.target) && user.length > 0

  return (
    <div data-testid="regex-level" data-solved={cleared ? 'true' : 'false'}>
      <p>{level.goal}</p>
      <p className="rx-text" data-testid="rx-text" aria-label="Text to search">
        {runs(level.text, run).map((r, i) => (
          <span key={i} className={`${r.mine ? 'rx-mine' : ''} ${r.goal ? 'rx-goal' : ''}`.trim()}>{r.text}</span>
        ))}
      </p>
      <p className="muted small">Gold fill: what your pattern matches. Dashed underline: what you need to match.</p>
      <label className="rx-input">
        <span className="small muted">Python regex (raw string)</span>
        <input value={pattern} maxLength={200} onChange={(e) => change(e.target.value)} placeholder="type a pattern…" spellCheck={false} autoCapitalize="off" autoComplete="off" data-testid="rx-input" />
      </label>
      <div className="chips rx-find" data-testid="rx-find">
        <span className="muted small">Find:</span>
        {level.expected.map((e, i) => (
          <span key={i} className={`chip ${found.includes(e) ? 'found' : 'idle'}`}>{found.includes(e) ? '★ ' : ''}{e}</span>
        ))}
      </div>
      {user.length > 0 && user[0][2].length > 0 && (
        <ul className="rx-groups small" data-testid="rx-groups">
          {user.slice(0, 5).map(([s, e, g], i) => <li key={i}><code>{level.text.slice(s, e)}</code> → groups {JSON.stringify(g)}</li>)}
        </ul>
      )}
      <p className="viz-note" role="status" data-testid="rx-status">
        {problem ? <span className="err-text">{problem}</span>
          : busy || (status !== 'ready' && status !== 'running' && pattern) ? 'Running real Python re…'
          : pattern === '' ? 'Type a pattern. Python runs it as you type.'
          : exact ? '✓ Exactly the right matches!'
          : `Matching ${user.length} thing${user.length === 1 ? '' : 's'}${user.length > 0 && found.length < level.expected.length ? `, ${found.length} of ${level.expected.length} targets found` : ''}. Keep going.`}
      </p>
      <details>
        <summary>Stuck? Hint</summary>
        <p>{level.hint}</p>
        <button className="ghost" onClick={() => change(level.solution)} data-testid="rx-reveal">Fill in a working pattern</button>
      </details>
    </div>
  )
}

export default function RegexHunter({ onFinished }: { onFinished: () => void }) {
  const [idx, setIdx] = useState(0)
  const { solved, mark } = useSolved(REGEX_LEVELS.map((l) => l.id), onFinished)
  const level = REGEX_LEVELS[idx]
  return (
    <div className="viz game" data-testid="game-regex-hunter">
      <LevelTabs levels={REGEX_LEVELS} active={idx} solved={solved} onPick={setIdx} label="Regex levels" />
      <HunterLevel key={level.id} level={level} cleared={solved.includes(level.id)} onSolved={() => mark(level.id)} />
    </div>
  )
}
