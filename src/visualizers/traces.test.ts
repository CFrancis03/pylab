import { describe, expect, it } from 'vitest'
import { c3 } from './mro'
import { parseSliceField, sliceExpr, sliceIndices } from './slicing'
import { TRACES } from './traces'

describe('trace scenario data', () => {
  for (const s of Object.values(TRACES)) {
    describe(s.id, () => {
      const lines = s.code.split('\n').length
      it('has frames that point at real lines and only ever append output', () => {
        expect(s.frames.length).toBeGreaterThan(2)
        s.frames.forEach((f, i) => {
          expect(f.line).toBeGreaterThanOrEqual(1)
          expect(f.line).toBeLessThanOrEqual(lines)
          expect(f.note.length).toBeGreaterThan(10)
          expect(f.tracks.length).toBeGreaterThan(0)
          if (i > 0) expect(f.out.slice(0, s.frames[i - 1].out.length)).toEqual(s.frames[i - 1].out)
        })
        expect(s.frames[s.frames.length - 1].out.join('\n')).toBe(s.expectedOutput)
      })
    })
  }
})

describe('c3', () => {
  it('linearizes the diamond', () => expect(c3('D', { A: [], B: ['A'], C: ['A'], D: ['B', 'C'] })).toEqual(['D', 'B', 'C', 'A', 'object']))
  it('rejects an inconsistent order', () => expect(c3('Z', { X: [], Y: ['X'], Z: ['X', 'Y'] })).toBeNull())
  it('puts object last for a plain class', () => expect(c3('A', { A: [] })).toEqual(['A', 'object']))
})

describe('sliceIndices', () => {
  it('matches Python on the lecture-style cases', () => {
    expect(sliceIndices(7, 1, 6, 2)).toEqual([1, 3, 5])
    expect(sliceIndices(5, null, null, -1)).toEqual([4, 3, 2, 1, 0])
    expect(sliceIndices(5, 10, null, null)).toEqual([])
    expect(sliceIndices(5, -2, null, null)).toEqual([3, 4])
    expect(sliceIndices(8, 5, 1, -2)).toEqual([5, 3])
  })
  it('refuses a zero step', () => expect(() => sliceIndices(3, null, null, 0)).toThrow())
  it('parses and prints fields', () => {
    expect(parseSliceField('')).toBeNull()
    expect(parseSliceField(' -3 ')).toBe(-3)
    expect(parseSliceField('2.5')).toBe('invalid')
    expect(sliceExpr('a', '1', '', '')).toBe('a[1:]')
    expect(sliceExpr('a', '', '', '-1')).toBe('a[::-1]')
  })
})
