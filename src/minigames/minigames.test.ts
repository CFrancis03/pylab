import { describe, expect, it } from 'vitest'
import { DUNDER_ROUNDS, shuffled } from './dunders'
import { edges, hiddenSlots, TREE_LEVELS } from './exceptionTree'
import { REGEX_LEVELS, sameMatches } from './regexHunter'
import { ENDIAN_LEVELS, formatString, parseHex, unpack } from './structLab'
import { itemsOf, regionItems, sameRegions, VENN_LEVELS } from './venn'

describe('unpack', () => {
  it('reads byte order', () => {
    expect(unpack('<', ['H'], [0, 1])).toEqual({ ok: true, values: ['256'] })
    expect(unpack('>', ['H'], [0, 1])).toEqual({ ok: true, values: ['1'] })
  })
  it('handles signed values and wide integers', () => {
    expect(unpack('>', ['h'], [0xff, 0xfe])).toEqual({ ok: true, values: ['-2'] })
    expect(unpack('<', ['I'], [255, 255, 255, 255])).toEqual({ ok: true, values: ['4294967295'] })
    expect(unpack('>', ['q'], Array(8).fill(255))).toEqual({ ok: true, values: ['-1'] })
  })
  it('reports a size mismatch like struct does', () => {
    expect(unpack('<', ['I'], [1, 2])).toEqual({ ok: false, error: 'unpack requires a buffer of 4 bytes' })
  })
  it('parses hex and formats', () => {
    expect(parseHex('00 ff  2a')).toEqual([0, 255, 42])
    expect(formatString('<', ['H', 'I'])).toBe('<HI')
  })
  it('every level is solved by its own solution', () => {
    for (const l of ENDIAN_LEVELS) {
      const r = unpack(l.solution.order, l.solution.fields, parseHex(l.bytes))
      expect(r.ok && r.values).toEqual(l.target)
    }
  })
})

describe('game data', () => {
  it('regex levels list their targets and have unique ids', () => {
    expect(new Set(REGEX_LEVELS.map((l) => l.id)).size).toBe(REGEX_LEVELS.length)
    for (const l of REGEX_LEVELS) expect(l.expected.length).toBeGreaterThan(0)
    expect(sameMatches([[0, 1, []]], [[0, 1, []]])).toBe(true)
    expect(sameMatches([[0, 1, []]], [[0, 2, []]])).toBe(false)
  })
  it('venn regions partition the sets', () => {
    for (const l of VENN_LEVELS) {
      const r = regionItems(l)
      expect([...r.onlyA, ...r.both].sort()).toEqual([...l.A].sort())
      expect([...r.onlyB, ...r.both].sort()).toEqual([...l.B].sort())
    }
    expect(itemsOf({ A: [1, 2, 3], B: [3, 4] }, ['onlyA', 'onlyB'])).toEqual([1, 2, 4])
    expect(sameRegions(['both', 'onlyA'], ['onlyA', 'both'])).toBe(true)
  })
  it('exception trees have slots with clues', () => {
    for (const l of TREE_LEVELS) {
      expect(hiddenSlots(l.root).length).toBeGreaterThan(0)
      expect(edges(l.root).length).toBeGreaterThan(0)
    }
  })
  it('dunder rounds are 6 pairs and the shuffle is a permutation that moves things', () => {
    for (const r of DUNDER_ROUNDS) {
      expect(r.pairs).toHaveLength(6)
      const order = shuffled(r.pairs.map((_, i) => i))
      expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5])
      expect(order).not.toEqual([0, 1, 2, 3, 4, 5])
    }
  })
})
