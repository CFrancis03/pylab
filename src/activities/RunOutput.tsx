import type { RunResult } from '../engine/types'

/** Output, traceback and per-check results of one run. */
export default function RunOutput({ result, graded }: { result: RunResult; graded: boolean }) {
  const checks = result.results ?? []
  return (
    <div className="run-output" data-testid="run-output">
      {result.stdout && <pre className="out-pre" tabIndex={0} data-testid="stdout">{result.stdout}</pre>}
      {result.stderr && <pre className="out-pre err" tabIndex={0}>{result.stderr}</pre>}
      {result.error && <pre className="out-pre err" tabIndex={0} data-testid="error">{result.error}</pre>}
      {result.truncated && <p className="muted small">Output was cut off.</p>}
      {graded && checks.length > 0 && (
        <ul className="checks" data-testid="checks">
          {checks.map((t, i) => (
            <li key={i} className={t.ok ? 'ok' : 'bad'}>
              {t.ok ? '✓' : '✗'} {t.name}
              {!t.ok && t.want !== undefined && ` — got ${t.got}, expected ${t.want}`}
              {!t.ok && t.want === undefined && t.got ? ` — ${t.got}` : ''}
            </li>
          ))}
        </ul>
      )}
      {!result.stdout && !result.stderr && !result.error && !graded && <p className="muted small">(no output)</p>}
    </div>
  )
}
