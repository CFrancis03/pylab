import { src } from '../content/helpers'
import type { TraceFrame, TraceScenario } from './types'

/** Class name to the names of its direct bases, in the order they are written in the class statement. */
export type Hierarchy = Record<string, string[]>

/** C3 linearization, as used by Python for `__mro__`. Returns null when no consistent order exists. */
export function c3(cls: string, h: Hierarchy): string[] | null {
  if (cls === 'object') return ['object']
  const bases = h[cls]?.length ? h[cls] : ['object']
  const lists: string[][] = []
  for (const b of bases) {
    const m = c3(b, h)
    if (!m) return null
    lists.push(m)
  }
  lists.push([...bases])
  const result = [cls]
  for (;;) {
    const live = lists.filter((l) => l.length > 0)
    if (live.length === 0) return result
    const head = live.map((l) => l[0]).find((c) => live.every((l) => !l.slice(1).includes(c)))
    if (!head) return null
    result.push(head)
    for (const l of lists) if (l[0] === head) l.shift()
  }
}

/** Python source where each class prints its name and hands on with `super()` until the end of the chain. */
function demoCode(h: Hierarchy, target: string, order: string[]) {
  const lines: string[] = []
  const printLine: Record<string, number> = {}
  for (const name of Object.keys(h)) {
    const bases = h[name]
    lines.push(`class ${name}${bases.length ? `(${bases.join(', ')})` : ''}:`)
    lines.push('    def hi(self):')
    lines.push(`        print("${name}")`)
    printLine[name] = lines.length
    if (name !== order[order.length - 1]) lines.push('        super().hi()')
  }
  lines.push(`${target}().hi()`)
  return { code: src(...lines), printLine }
}

function chain(order: string[], at: number): TraceFrame['tracks'] {
  return [
    {
      title: 'method resolution order',
      chips: order.map((c, i) => ({ text: c, tone: i < at ? 'done' : i === at ? 'active' : 'idle' })),
    },
  ]
}

function demo(id: string, title: string, h: Hierarchy, target: string): TraceScenario {
  const full = c3(target, h)
  if (!full) throw new Error(`mro preset ${id} has no consistent order`)
  const order = full.filter((c) => c !== 'object')
  const { code, printLine } = demoCode(h, target, order)
  const frames: TraceFrame[] = [
    {
      line: 1, // replaced by withFirstLine
      note: `Python computes ${target}.__mro__ once, when the class is created: ${full.join(' → ')}. super() always means "the next class in THIS list", not "the parent class".`,
      tracks: [{ title: 'method resolution order', chips: full.map((c) => ({ text: c, tone: 'idle' as const })) }],
      out: [],
    },
  ]
  order.forEach((c, i) => {
    const next = order[i + 1]
    frames.push({
      line: printLine[c],
      note: next
        ? `${c}.hi runs and prints its name, then super().hi() looks up the next class after ${c} in ${target}'s order: ${next}.`
        : `${c}.hi is last in the chain, so it prints and does not call super().`,
      tracks: chain(order, i),
      out: order.slice(0, i + 1),
    })
  })
  return { id, family: 'mro', title, code, expectedOutput: order.join('\n'), frames }
}

const diamond: Hierarchy = { A: [], B: ['A'], C: ['A'], D: ['B', 'C'] }
const mixins: Hierarchy = { Base: [], Loggable: [], Saveable: [], Item: ['Loggable', 'Saveable', 'Base'] }

// The first frame points at the last `class` header, which is the target's.
function withFirstLine(s: TraceScenario): TraceScenario {
  const lines = s.code.split('\n')
  s.frames[0].line = lines.findLastIndex((l) => l.startsWith('class ')) + 1
  return s
}

const conflict: TraceScenario = {
  id: 'mro-conflict',
  family: 'mro',
  title: 'No consistent order',
  code: src('class X:', '    pass', '', 'class Y(X):', '    pass', '', 'try:', '    class Z(X, Y):', '        pass', 'except TypeError:', '    print("TypeError: no consistent order")'),
  expectedOutput: 'TypeError: no consistent order',
  frames: [
    {
      line: 8,
      note: 'Z lists X before Y. But Y itself inherits from X, so Python also needs Y BEFORE X (a subclass must come before its base).',
      tracks: [{ title: 'constraints on the order', chips: [{ text: 'X before Y (from Z(X, Y))', tone: 'active' }, { text: 'Y before X (Y is a subclass of X)', tone: 'active' }] }],
      out: [],
    },
    {
      line: 8,
      note: 'Both constraints cannot hold at once, so the C3 merge gets stuck and the class statement fails.',
      tracks: [{ title: 'constraints on the order', chips: [{ text: 'X before Y', tone: 'error' }, { text: 'Y before X', tone: 'error' }] }],
      out: [],
    },
    {
      line: 11,
      note: 'The failure is a TypeError raised while creating the class. The fix is to write the bases in a compatible order: class Z(Y, X).',
      tracks: [{ title: 'constraints on the order', chips: [{ text: 'TypeError: Cannot create a consistent method resolution order', tone: 'error' }] }],
      out: ['TypeError: no consistent order'],
    },
  ],
}

export const MRO_SCENARIOS: TraceScenario[] = [
  withFirstLine(demo('mro-diamond', 'The diamond', diamond, 'D')),
  withFirstLine(demo('mro-mixins', 'Mixins', mixins, 'Item')),
  conflict,
]
