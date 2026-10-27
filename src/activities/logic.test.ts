import { describe, expect, it } from 'vitest'
import { addDays, INTERVALS, isDue, rateCard } from '../game/srs'
import { xpAfterHints } from '../game/xp'
import { bossScore, checkParsons, isMcqCorrect, normalizeOutput, shuffleSeeded } from './logic'

describe('output matching', () => {
  it('ignores trailing whitespace, CRLF and edge blank lines only', () => {
    expect(normalizeOutput('2.5 2 8  \r\n\n')).toBe('2.5 2 8')
    expect(normalizeOutput('a\n\nb')).toBe('a\n\nb')
    expect(normalizeOutput('a b')).not.toBe(normalizeOutput('a  b'))
  })
})

describe('mcq', () => {
  it('requires exactly the right set for select-all questions', () => {
    expect(isMcqCorrect(1, [1])).toBe(true)
    expect(isMcqCorrect(1, [0])).toBe(false)
    expect(isMcqCorrect([0, 2], [2, 0])).toBe(true)
    expect(isMcqCorrect([0, 2], [0])).toBe(false)
    expect(isMcqCorrect([0, 2], [0, 1, 2])).toBe(false)
    expect(isMcqCorrect(1, [])).toBe(false)
  })
})

describe('parsons', () => {
  it('compares exact lines including indentation', () => {
    expect(checkParsons(['a', '    b'], ['a', '    b'])).toBe(true)
    expect(checkParsons(['a', '    b'], ['a', 'b'])).toBe(false)
    expect(checkParsons(['a', 'b'], ['a'])).toBe(false)
  })
})

describe('shuffleSeeded', () => {
  const xs = [1, 2, 3, 4, 5, 6]
  it('is deterministic per key and a permutation', () => {
    expect(shuffleSeeded(xs, 'k')).toEqual(shuffleSeeded(xs, 'k'))
    expect([...shuffleSeeded(xs, 'k')].sort()).toEqual(xs)
  })
  it('never returns the original order, for any key', () => {
    for (let i = 0; i < 200; i++) expect(shuffleSeeded(xs, `key-${i}`)).not.toEqual(xs)
    expect(shuffleSeeded([1, 2], 'x')).toEqual([2, 1])
  })
  it('handles tiny inputs and does not mutate', () => {
    expect(shuffleSeeded([], 'k')).toEqual([])
    expect(shuffleSeeded([7], 'k')).toEqual([7])
    expect(xs).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('hint-cost xp', () => {
  it('costs 25% per hint, floors at 25% and at 1 xp', () => {
    expect([0, 1, 2, 3, 4, 9].map((h) => xpAfterHints(20, h))).toEqual([20, 15, 10, 5, 5, 5])
    expect(xpAfterHints(2, 3)).toBe(1)
  })
})

describe('spaced repetition', () => {
  it('adds days across month ends', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })
  it('promotes known cards, resets forgotten ones, and caps at the top box', () => {
    let c = rateCard(undefined, true, '2026-03-01')
    expect(c).toEqual({ box: 1, due: '2026-03-02' })
    c = rateCard(c, true, '2026-03-02')
    expect(c).toEqual({ box: 2, due: '2026-03-05' })
    expect(rateCard(c, false, '2026-03-05')).toEqual({ box: 0, due: '2026-03-05' })
    let top = c
    for (let i = 0; i < 10; i++) top = rateCard(top, true, '2026-03-05')
    expect(top.box).toBe(INTERVALS.length - 1)
  })
  it('is due when new, on the due day, or overdue', () => {
    expect(isDue(undefined, '2026-03-01')).toBe(true)
    expect(isDue({ box: 1, due: '2026-03-02' }, '2026-03-01')).toBe(false)
    expect(isDue({ box: 1, due: '2026-03-02' }, '2026-03-02')).toBe(true)
  })
})

describe('boss score', () => {
  it('is a fraction and survives an empty quiz', () => {
    expect(bossScore(3, 4)).toBe(0.75)
    expect(bossScore(0, 0)).toBe(0)
  })
})
