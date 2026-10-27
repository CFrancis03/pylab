import { describe, expect, it } from 'vitest'
import { danglingRefs, describeFrame, GEOM, layoutFrame } from './layout'
import { SCENARIOS } from './scenarios'

describe('scenario data', () => {
  for (const s of Object.values(SCENARIOS)) {
    describe(s.id, () => {
      const lines = s.code.split('\n').length
      it('has frames whose lines exist and whose references resolve', () => {
        expect(s.frames.length).toBeGreaterThan(2)
        for (const f of s.frames) {
          expect(f.line).toBeGreaterThanOrEqual(0)
          expect(f.line).toBeLessThanOrEqual(lines)
          expect(danglingRefs(f)).toEqual([])
          expect(new Set(f.objects.map((o) => o.id)).size).toBe(f.objects.length)
        }
      })
      it('only ever appends to the output, ending with the real output', () => {
        for (let i = 1; i < s.frames.length; i++) {
          const prev = s.frames[i - 1].out
          expect(s.frames[i].out.slice(0, prev.length)).toEqual(prev)
        }
        expect(s.frames[s.frames.length - 1].out.join('\n')).toBe(s.expectedOutput)
      })
    })
  }
})

describe('layoutFrame', () => {
  const f = SCENARIOS.rebind.frames[2]
  const l = layoutFrame(f)
  it('stacks scopes without overlap', () => {
    for (let i = 1; i < l.scopes.length; i++) expect(l.scopes[i].y).toBeGreaterThanOrEqual(l.scopes[i - 1].y + l.scopes[i - 1].h)
  })
  it('draws one arrow per pointing name, ending at the centre of its target', () => {
    expect(l.arrows).toHaveLength(2)
    for (const a of l.arrows) {
      const target = l.objects.find((o) => o.y + o.h / 2 === a.to.y)
      expect(target).toBeDefined()
      expect(a.to.x).toBe(GEOM.objX)
      expect(a.from.x).toBe(GEOM.scopeX + GEOM.scopeW)
    }
  })
  it('skips arrows for declared names and dangling targets', () => {
    const declared = layoutFrame(SCENARIOS['global-x'].frames[2])
    expect(declared.arrows.map((a) => a.key)).toEqual(['global.x'])
    const bad = layoutFrame({ line: 0, note: '', out: [], objects: [], scopes: [{ name: 's', vars: [{ name: 'a', to: 'missing' }] }] })
    expect(bad.arrows).toEqual([])
    expect(danglingRefs({ line: 0, note: '', out: [], objects: [], scopes: [{ name: 's', vars: [{ name: 'a', to: 'missing' }] }] })).toEqual(['s.a -> missing'])
  })
  it('flags arrows into dying objects', () => {
    const last = layoutFrame(SCENARIOS.rebind.frames[3])
    expect(last.objects.some((o) => o.state === 'dim')).toBe(true)
    expect(last.arrows.every((a) => !a.toDim)).toBe(true)
  })
})

describe('describeFrame', () => {
  it('describes names, empty scopes and garbage in words', () => {
    expect(describeFrame(SCENARIOS.rebind.frames[1])).toContain('change_list scope: inner_list points to list [0, 1, 2, 3, 4]')
    expect(describeFrame(SCENARIOS['local-x'].frames[1])).toContain('f scope is empty')
    expect(describeFrame(SCENARIOS.rebind.frames[3])).toContain('No names refer to list [10, 9, 8, 7, 6]')
    expect(describeFrame(SCENARIOS['global-x'].frames[2])).toContain('declared as belonging to another scope')
  })
})
