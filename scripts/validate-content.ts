/**
 * Content validator. Run with `npm run validate-content`.
 *  1. Regions are schema-checked at import time (defineRegion -> zod).
 *  2. Every code-challenge reference solution is run against its hidden tests under CPython.
 *  3. Every predict-output `expected` is compared with real CPython stdout.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { regions } from '../src/content/index.ts'
import { SCENARIOS } from '../src/visualizers/scenarios.ts'
import { TRACES } from '../src/visualizers/traces.ts'
import { sliceIndices } from '../src/visualizers/slicing.ts'
import { EXPLORERS, IMPLEMENTED, findScenario } from '../src/visualizers/registry.ts'
import { REGEX_LEVELS } from '../src/minigames/regexHunter.ts'
import { CODES, ENDIAN_LEVELS, formatString, parseHex, unpack, type Code, type Order } from '../src/minigames/structLab.ts'
import { VENN_LEVELS, itemsOf } from '../src/minigames/venn.ts'
import { TREE_LEVELS, edges, hiddenSlots } from '../src/minigames/exceptionTree.ts'
import { DUNDER_ROUNDS } from '../src/minigames/dunders.ts'
import type { CodeChallenge, Parsons, PredictOutput, SpotBug } from '../src/content/schema.ts'

const harness = readFileSync(new URL('../src/engine/harness.py', import.meta.url), 'utf8')

function runPython(source: string, timeoutMs = 10_000) {
  const r = spawnSync('python3', ['-I', '-'], { input: source, encoding: 'utf8', timeout: timeoutMs })
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status }
}

const errors: string[] = []
let checked = 0

function validateChallenge(where: string, c: CodeChallenge) {
  checked++
  const fileSetup = Object.entries(c.files)
    .map(([name, body]) => `open(${JSON.stringify(name)}, 'w', encoding='utf-8').write(${JSON.stringify(body)})`)
    .join('\n')
  // Run inside a scratch dir so virtual files never touch the repo.
  const src = [
    'import os, tempfile',
    "os.chdir(tempfile.mkdtemp())",
    fileSetup,
    harness,
    c.solution,
    c.tests,
    '_report()',
  ].join('\n')
  const { stdout, stderr, status } = runPython(src, c.timeoutMs + 5000)
  const m = stdout.match(/__RESULTS__(.*)$/m)
  if (status !== 0 || !m) {
    errors.push(`${where}: solution crashed\n${stderr.trim()}`)
    return
  }
  const results = JSON.parse(m[1]) as { name: string; ok: boolean; got?: string; want?: string }[]
  if (results.length === 0) errors.push(`${where}: tests ran no checks`)
  for (const r of results.filter((x) => !x.ok)) {
    errors.push(`${where}: reference solution fails "${r.name}" (got ${r.got}, want ${r.want})`)
  }
  // A starter that already passes means the challenge is trivial.
  const starter = runPython(['import os, tempfile', 'os.chdir(tempfile.mkdtemp())', fileSetup, harness, c.starter, c.tests, '_report()'].join('\n'), c.timeoutMs + 5000)
  const sm = starter.stdout.match(/__RESULTS__(.*)$/m)
  if (sm) {
    const sr = JSON.parse(sm[1]) as { ok: boolean }[]
    if (sr.length > 0 && sr.every((x) => x.ok)) errors.push(`${where}: starter code already passes all tests`)
  }
}

function validatePredict(where: string, a: PredictOutput) {
  checked++
  const { stdout, stderr, status } = runPython(a.code)
  if (status !== 0) {
    errors.push(`${where}: code raised\n${stderr.trim()}`)
    return
  }
  if (stdout.trimEnd() !== a.expected.trimEnd()) {
    errors.push(`${where}: expected ${JSON.stringify(a.expected)} but CPython printed ${JSON.stringify(stdout)}`)
  }
}

function validateParsons(where: string, a: Parsons) {
  checked++
  const { stderr, status } = runPython(a.lines.join('\n'))
  if (status !== 0) errors.push(`${where}: the correct line order does not run\n${stderr.trim()}`)
  for (const d of a.distractors) if (a.lines.includes(d)) errors.push(`${where}: distractor ${JSON.stringify(d)} duplicates a real line`)
}

function validateSpotBug(where: string, a: SpotBug) {
  const n = a.code.split('\n').length
  if (a.bugLines.some((l) => l > n)) errors.push(`${where}: bugLines beyond the ${n} lines of code`)
}

function validateMcq(where: string, options: string[], answer: number | number[]) {
  const answers = Array.isArray(answer) ? answer : [answer]
  if (answers.some((i) => i < 0 || i >= options.length)) errors.push(`${where}: answer index out of range`)
  if (new Set(options).size !== options.length) errors.push(`${where}: duplicate options`)
}

function validateScenarios() {
  for (const sc of [...Object.values(SCENARIOS), ...Object.values(TRACES)]) {
    checked++
    const { stdout, stderr, status } = runPython(sc.code)
    if (status !== 0) errors.push(`scenario ${sc.id}: code raised\n${stderr.trim()}`)
    else if (stdout.trimEnd() !== sc.expectedOutput) errors.push(`scenario ${sc.id}: expected ${JSON.stringify(sc.expectedOutput)} but CPython printed ${JSON.stringify(stdout)}`)
  }
}

/** The explorer's slice maths must agree with real Python for every start/stop/step on short sequences. */
function validateSliceMaths() {
  checked++
  const vals = [null, -8, -7, -3, -2, -1, 0, 1, 2, 3, 5, 7, 9]
  const steps = [null, -9, -3, -2, -1, 1, 2, 3, 9]
  const py = (v: number | null) => (v === null ? 'None' : String(v))
  const source = [
    'import json',
    'out = []',
    'for n in range(0, 8):',
    '    seq = list(range(n))',
    `    for a in [${vals.map(py).join(', ')}]:`,
    `        for b in [${vals.map(py).join(', ')}]:`,
    `            for c in [${steps.map(py).join(', ')}]:`,
    '                out.append([n, a, b, c, seq[a:b:c]])',
    'print(json.dumps(out))',
  ].join('\n')
  const { stdout, stderr, status } = runPython(source)
  if (status !== 0) return void errors.push(`slice grid: python failed\n${stderr.trim()}`)
  let bad = 0
  for (const [n, a, b, c, want] of JSON.parse(stdout) as [number, number | null, number | null, number | null, number[]][]) {
    const got = sliceIndices(n, a, b, c)
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      if (bad++ < 3) errors.push(`slice maths: len ${n}, [${a}:${b}:${c}] gave ${JSON.stringify(got)} but Python gave ${JSON.stringify(want)}`)
    }
  }
}

/** Python's json.dumps spaces differ from JSON.stringify; compare parsed values. */
const norm = (text: string): string => { try { return JSON.stringify(JSON.parse(text)) } catch { return text.trim() } }

function validateMinigames() {
  // Regex Hunter: each level's solution must produce exactly the listed matches under CPython's re.
  for (const l of REGEX_LEVELS) {
    checked++
    const r = runPython(['import re, json', `print(json.dumps([m.group(0) for m in re.finditer(${JSON.stringify(l.solution)}, ${JSON.stringify(l.text)})]))`].join('\n'))
    if (r.status !== 0) errors.push(`regex ${l.id}: python failed\n${r.stderr.trim()}`)
    else if (norm(r.stdout) !== JSON.stringify(l.expected)) errors.push(`regex ${l.id}: solution matches ${r.stdout.trim()} but expected ${JSON.stringify(l.expected)}`)
  }

  // Endian puzzle: the reference solution works under struct, and the TS unpack agrees with struct on a broad sample.
  for (const l of ENDIAN_LEVELS) {
    checked++
    const fmt = formatString(l.solution.order, l.solution.fields)
    const data = parseHex(l.bytes)
    const r = runPython(['import struct, json', `print(json.dumps([str(v) for v in struct.unpack(${JSON.stringify(fmt)}, bytes(${JSON.stringify(data)}))]))`].join('\n'))
    if (r.status !== 0) errors.push(`endian ${l.id}: python failed\n${r.stderr.trim()}`)
    else if (norm(r.stdout) !== JSON.stringify(l.target)) errors.push(`endian ${l.id}: struct gives ${r.stdout.trim()} but target is ${JSON.stringify(l.target)}`)
    const mine = unpack(l.solution.order, l.solution.fields, data)
    if (!mine.ok || JSON.stringify(mine.values) !== JSON.stringify(l.target)) errors.push(`endian ${l.id}: TS unpack disagrees with the target`)
  }
  {
    checked++
    let seed = 12345
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648)
    const cases: { order: Order; fields: Code[]; data: number[] }[] = []
    const shapes: Code[][] = [...CODES.map((c) => [c.code]), ['H', 'H'], ['I', 'H'], ['B', 'b'], ['h', 'I']]
    for (const order of ['<', '>'] as Order[]) {
      for (const fields of shapes) {
        const size = fields.reduce((n, f) => n + (CODES.find((c) => c.code === f)?.size ?? 0), 0)
        for (let k = 0; k < 12; k++) cases.push({ order, fields, data: Array.from({ length: size }, () => [0, 1, 0x7f, 0x80, 0xff, rnd() % 256][rnd() % 6]) })
        cases.push({ order, fields, data: Array.from({ length: size + 1 }, () => rnd() % 256) }) // wrong length
      }
    }
    const py = [
      'import struct, json',
      `cases = json.loads(${JSON.stringify(JSON.stringify(cases))})`,
      'out = []',
      'for c in cases:',
      '    try:',
      "        out.append([str(v) for v in struct.unpack(c['order'] + ''.join(c['fields']), bytes(c['data']))])",
      '    except struct.error:',
      "        out.append('ERR')",
      'print(json.dumps(out))',
    ].join('\n')
    const r = runPython(py)
    if (r.status !== 0) errors.push(`struct grid: python failed\n${r.stderr.trim()}`)
    else {
      const want = JSON.parse(r.stdout) as (string[] | 'ERR')[]
      let bad = 0
      cases.forEach((c, i) => {
        const got = unpack(c.order, c.fields, c.data)
        const mineVal = got.ok ? got.values : 'ERR'
        if (JSON.stringify(mineVal) !== JSON.stringify(want[i]) && bad++ < 3) errors.push(`struct grid: ${formatString(c.order, c.fields)} on ${c.data} gave ${JSON.stringify(mineVal)} but Python gave ${JSON.stringify(want[i])}`)
      })
    }
  }

  // Set Venn: each level's regions must equal the real Python set expression, and only one option may be right.
  for (const l of VENN_LEVELS) {
    checked++
    const evalIn = (expr: string) => {
      const r = runPython(['import json', `A = set(${JSON.stringify(l.A)})`, `B = set(${JSON.stringify(l.B)})`, `print(json.dumps(sorted(${expr})))`].join('\n'))
      return r.status === 0 ? norm(r.stdout) : `error: ${r.stderr.trim()}`
    }
    const want = JSON.stringify(itemsOf(l, l.answer))
    if (evalIn(l.expr) !== want) errors.push(`venn ${l.id}: "${l.expr}" is ${evalIn(l.expr)} in Python but the regions give ${want}`)
    if (l.mode === 'name') {
      if (!l.options?.includes(l.expr)) errors.push(`venn ${l.id}: options must include the answer`)
      for (const o of l.options ?? []) if (o !== l.expr && evalIn(o) === want) errors.push(`venn ${l.id}: option "${o}" is also correct`)
    }
  }

  // Exception tree: every edge is a real direct-base relationship in CPython's built-in hierarchy.
  for (const l of TREE_LEVELS) {
    checked++
    const pairs = edges(l.root)
    const code = ['import builtins, json', `pairs = json.loads(${JSON.stringify(JSON.stringify(pairs))})`, 'bad = [p for p in pairs if getattr(builtins, p[1]).__bases__[0] is not getattr(builtins, p[0])]', 'print(json.dumps(bad))'].join('\n')
    const r = runPython(code)
    if (r.status !== 0) errors.push(`exception tree ${l.id}: python failed\n${r.stderr.trim()}`)
    else if (norm(r.stdout) !== '[]') errors.push(`exception tree ${l.id}: not direct-base pairs in CPython: ${r.stdout.trim()}`)
    const names = hiddenSlots(l.root).map((h) => h.name)
    if (new Set(names).size !== names.length) errors.push(`exception tree ${l.id}: duplicate hidden names`)
    if (names.length === 0) errors.push(`exception tree ${l.id}: nothing to place`)
  }

  // Dunder matcher: for each pair, the syntax really calls that method.
  for (const round of DUNDER_ROUNDS) {
    checked++
    if (new Set(round.pairs.map((q) => q.dunder)).size !== round.pairs.length) errors.push(`dunders ${round.id}: duplicate dunder`)
    for (const q of round.pairs) {
      const probe = [
        'hits = []',
        'class P:',
        `    def ${q.dunder}(self, *a, **k):`,
        '        hits.append(1)',
        `        return ${q.ret}`,
        ...(q.extra ? [q.extra] : []),
        'x = P()',
        'y = P()',
        'hits.clear()',
        q.probe,
        `assert hits, "${q.dunder} was never called by ${q.expr.replace(/"/g, "'")}"`,
      ].join('\n')
      const r = runPython(probe)
      if (r.status !== 0) errors.push(`dunders ${round.id}: ${q.expr} -> ${q.dunder}\n${r.stderr.trim().split('\n').slice(-2).join(' ')}`)
    }
  }
}

const seen = new Set<string>()
function uniqueId(where: string, id: string) {
  if (seen.has(id)) errors.push(`${where}: duplicate id "${id}"`)
  seen.add(id)
}

validateScenarios()
validateSliceMaths()
validateMinigames()

for (const region of regions) {
  uniqueId(region.id, region.id)
  for (const lesson of region.lessons) {
    for (const a of lesson.activities) {
      const where = `${region.id}/${lesson.id}/${a.id}`
      uniqueId(where, a.id)
      if (a.type === 'code-challenge') validateChallenge(where, a)
      else if (a.type === 'predict-output') validatePredict(where, a)
      else if (a.type === 'visualizer') {
        const ids = Array.isArray(a.params.scenarios) ? a.params.scenarios.map(String) : []
        if (!EXPLORERS[a.name] && IMPLEMENTED[a.name] && ids.length === 0) errors.push(`${where}: visualizer has no scenarios`)
        for (const id of ids) {
          const sc = findScenario(id)
          if (!sc) errors.push(`${where}: unknown scenario "${id}"`)
          else if (sc.family !== a.name) errors.push(`${where}: scenario "${id}" belongs to ${sc.family}, not ${a.name}`)
        }
      } else if (a.type === 'parsons') validateParsons(where, a)
      else if (a.type === 'spot-bug') validateSpotBug(where, a)
      else if (a.type === 'mcq') validateMcq(where, a.options, a.answer)
    }
  }
  for (const q of region.boss.questions) {
    uniqueId(`${region.id}/boss/${q.id}`, q.id)
    validateMcq(`${region.id}/boss/${q.id}`, q.options, q.answer)
  }
  validateChallenge(`${region.id}/boss`, region.boss.challenge)
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} content problem(s):\n`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`✓ ${regions.length} region(s) valid, ${checked} executable activities verified under CPython`)
