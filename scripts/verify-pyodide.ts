/**
 * Runs authored Python inside real Pyodide (the engine learners use) and checks it matches what the content claims.
 * `npm run validate-content` already checks against local CPython. This catches differences in the interpreter
 * version or platform (Pyodide is Python 3.14 on 32-bit WebAssembly). Run with `npm run verify-pyodide`.
 */
import { readFileSync } from 'node:fs'
import { loadPyodide } from 'pyodide'
import { regions } from '../src/content/index.ts'
import { SCENARIOS } from '../src/visualizers/scenarios.ts'
import { TRACES } from '../src/visualizers/traces.ts'

const harness = readFileSync(new URL('../src/engine/harness.py', import.meta.url), 'utf8')
const py = await loadPyodide()
console.log(`Pyodide runs Python ${py.runPython('import sys; sys.version.split()[0]')}`)

let out: string[] = []
py.setStdout({ batched: (s: string) => out.push(s) })
py.setStderr({ batched: (s: string) => out.push(`[stderr] ${s}`) })

/** Run source in a fresh namespace inside a scratch directory, returning stdout or the exception text. */
async function run(source: string, files: Record<string, string> = {}): Promise<{ stdout: string; error?: string }> {
  out = []
  const g = py.globals.get('dict')()
  try {
    g.set('__name__', '__main__') // the real worker does the same (src/engine/core.ts)
    py.runPython('import os, tempfile\nos.chdir(tempfile.mkdtemp())', { globals: g })
    for (const [name, body] of Object.entries(files)) py.FS.writeFile(name, body, { encoding: 'utf8' })
    await py.runPythonAsync(source, { globals: g })
    return { stdout: out.join('\n') }
  } catch (e) {
    return { stdout: out.join('\n'), error: String((e as Error).message).trim().split('\n').slice(-2).join(' ') }
  } finally {
    g.destroy()
  }
}

const problems: string[] = []
let checked = 0

for (const sc of [...Object.values(SCENARIOS), ...Object.values(TRACES)]) {
  checked++
  const r = await run(sc.code)
  if (r.error) problems.push(`scenario ${sc.id}: ${r.error}`)
  else if (r.stdout.trimEnd() !== sc.expectedOutput.trimEnd()) problems.push(`scenario ${sc.id}: expected ${JSON.stringify(sc.expectedOutput)} but Pyodide printed ${JSON.stringify(r.stdout)}`)
}

for (const region of regions) {
  const all = [...region.lessons.flatMap((l) => l.activities.map((a) => [`${region.id}/${l.id}/${a.id}`, a] as const)), [`${region.id}/boss`, region.boss.challenge] as const]
  for (const [where, a] of all) {
    if (a.type === 'predict-output') {
      checked++
      const r = await run(a.code)
      if (r.error) problems.push(`${where}: raised ${r.error}`)
      else if (r.stdout.trimEnd() !== a.expected.trimEnd()) problems.push(`${where}: expected ${JSON.stringify(a.expected)} but Pyodide printed ${JSON.stringify(r.stdout)}`)
    } else if (a.type === 'parsons') {
      checked++
      const r = await run(a.lines.join('\n'))
      if (r.error) problems.push(`${where}: correct order raised ${r.error}`)
    } else if (a.type === 'code-challenge') {
      checked++
      const r = await run([harness, a.solution, a.tests, '_report()'].join('\n'), a.files)
      const m = r.stdout.match(/__RESULTS__(.*)$/m)
      if (r.error || !m) { problems.push(`${where}: solution crashed ${r.error ?? ''}`); continue }
      for (const t of (JSON.parse(m[1]) as { name: string; ok: boolean; got?: string; want?: string }[]).filter((x) => !x.ok)) {
        problems.push(`${where}: "${t.name}" got ${t.got}, want ${t.want}`)
      }
    }
  }
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s) under Pyodide:\n` + problems.map((p) => `  - ${p}`).join('\n'))
  process.exit(1)
}
console.log(`✓ ${checked} snippets behave identically under Pyodide`)
