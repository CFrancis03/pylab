import { useEffect, useRef, useState } from 'react'
import { getEngineStatus, runPython, subscribeEngineStatus, warmUp, type EngineStatus } from '../engine/runner'
import type { RunResult } from '../engine/types'
import './EngineLab.css'

interface Preset {
  label: string
  code: string
  tests?: string
  stdin?: string
}

const PRESETS: Preset[] = [
  { label: 'Hello', code: "name = 'Pythonia'\nprint(f'Hello, {name}! 🐍')\nprint(2 ** 100)" },
  { label: 'Infinite loop (timeout)', code: "print('about to hang...')\nwhile True:\n    pass" },
  { label: 'Runaway output', code: "while True:\n    print('spam' * 20)" },
  { label: 'Traceback', code: "def f(x):\n    return 10 / x\n\nprint(f(2))\nprint(f(0))" },
  {
    label: 'Graded challenge',
    code: 'def double(x):\n    return x + 2\n',
    tests: "check('double(2)', double(2), 4)\ncheck('double(10)', double(10), 20)\ncheck_true('works for floats', double(1.5) == 3.0)",
  },
  {
    label: 'Binary file (struct)',
    code: "import struct\nraw = open('data.bin', 'rb').read()\nvf, vi, vs = struct.unpack('>di10s', raw)\nprint(len(raw), vf, vi, vs.decode())",
  },
  {
    label: 'Files: BOM + CSV',
    code: "print(repr(open('huck-finn-bom.txt').readline()))\nprint(repr(open('huck-finn-bom.txt', encoding='utf-8-sig').readline()))\n\nimport csv\nf = open('persons_of_concern.csv')\nfor _ in range(3):\n    next(f)\nprint(list(csv.DictReader(f))[2])",
  },
  { label: 'input()', code: "name = input('Name? ')\nage = int(input('Age? '))\nprint(f'{name} will be {age + 1} next year')", stdin: 'Ada\n36' },
]

const STATUS_LABEL: Record<EngineStatus, string> = {
  idle: 'Python not loaded',
  loading: 'Loading Python…',
  ready: 'Python ready',
  running: 'Running…',
  restarting: 'Restarting Python…',
}

export default function EngineLab() {
  const [preset, setPreset] = useState(0)
  const [code, setCode] = useState(PRESETS[0].code)
  const [tests, setTests] = useState(PRESETS[0].tests ?? '')
  const [stdin, setStdin] = useState(PRESETS[0].stdin ?? '')
  const [timeout, setTimeoutMs] = useState(3000)
  const [status, setStatus] = useState<EngineStatus>(getEngineStatus())
  const [live, setLive] = useState<{ stream: 'stdout' | 'stderr'; text: string }[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => subscribeEngineStatus(setStatus), [])

  const pick = (i: number) => {
    setPreset(i)
    setCode(PRESETS[i].code)
    setTests(PRESETS[i].tests ?? '')
    setStdin(PRESETS[i].stdin ?? '')
    setResult(null)
    setLive([])
  }

  const run = async () => {
    abort.current = new AbortController()
    setResult(null)
    setLive([])
    const r = await runPython(
      { code, tests: tests.trim() ? tests : undefined, stdin: stdin || undefined },
      {
        timeoutMs: timeout,
        signal: abort.current.signal,
        onChunk: (stream, text) => setLive((l) => [...l, { stream, text }]),
      },
    )
    setResult(r)
  }

  const busy = status === 'running'

  return (
    <main className="lab">
      <header>
        <h1>🐍 Engine Lab</h1>
        <span className={`pill pill-${status}`} data-testid="status">{STATUS_LABEL[status]}</span>
        <button className="ghost" onClick={() => void warmUp()} disabled={status !== 'idle'}>Preload</button>
      </header>

      <div className="row">
        <label>
          Preset{' '}
          <select value={preset} onChange={(e) => pick(Number(e.target.value))}>
            {PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
          </select>
        </label>
        <label>
          Timeout (ms){' '}
          <input type="number" min={500} step={500} value={timeout} onChange={(e) => setTimeoutMs(Number(e.target.value))} />
        </label>
      </div>

      <div className="grid">
        <label>Code
          <textarea data-testid="code" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={12} />
        </label>
        <label>Hidden tests (optional)
          <textarea data-testid="tests" value={tests} onChange={(e) => setTests(e.target.value)} spellCheck={false} rows={12} />
        </label>
      </div>
      <label>stdin
        <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false} rows={2} />
      </label>

      <div className="row">
        <button data-testid="run" onClick={() => void run()} disabled={busy}>▶ Run</button>
        <button className="ghost" data-testid="stop" onClick={() => abort.current?.abort()} disabled={!busy}>■ Stop</button>
      </div>

      <section className="out" data-testid="output">
        <h2>Output</h2>
        <pre>
          {(result ? [] : live).map((c, i) => <span key={i} className={c.stream}>{c.text}</span>)}
          {result && <>
            <span>{result.stdout}</span>
            <span className="stderr">{result.stderr}</span>
          </>}
        </pre>
        {result?.error && <pre className="error" data-testid="error">{result.error}</pre>}
        {result?.truncated && <p className="note">Output was truncated.</p>}
        {result?.results && (
          <ul className="checks" data-testid="checks">
            {result.results.map((t, i) => (
              <li key={i} className={t.ok ? 'ok' : 'bad'}>
                {t.ok ? '✓' : '✗'} {t.name}{!t.ok && t.want !== undefined ? ` — got ${t.got}, want ${t.want}` : ''}{!t.ok && t.want === undefined && t.got ? ` — ${t.got}` : ''}
              </li>
            ))}
          </ul>
        )}
        {result && (
          <p className="note" data-testid="summary">
            {result.timedOut ? '⏱ timed out' : result.ok ? '✅ ok' : '❌ failed'} · {Math.round(result.durationMs)} ms
          </p>
        )}
      </section>
    </main>
  )
}
