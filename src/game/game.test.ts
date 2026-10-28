import { describe, expect, it } from 'vitest'
import { BADGES, type BadgeCtx } from './badges'
import { emptyProgress, parseProgress, recordActivity, recordBoss, type ActivityResult } from './progress'
import { gateRegion, isUnlocked, nodeState } from './regions'
import { bumpStreak, currentStreak, dayKey, daysBetween, emptyStreak } from './streak'
import { levelForXp, levelProgress, levelTitle, xpForLevel } from './xp'

const ctx: BadgeCtx = { lessons: { l1: ['a', 'b'] } }
const at = (iso: string) => new Date(`${iso}T12:00:00`)
const ok = (id: string, xp = 10, topic = 't'): ActivityResult => ({ id, topic, xp, correct: true })

describe('xp & levels', () => {
  it('uses the 0/100/300/600/1000 curve', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000])
  })
  it('maps xp to level at the boundaries', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(99)).toBe(1)
    expect(levelForXp(100)).toBe(2)
    expect(levelForXp(299)).toBe(2)
    expect(levelForXp(300)).toBe(3)
  })
  it('reports progress inside a level', () => {
    expect(levelProgress(150)).toEqual({ level: 2, into: 50, span: 200, fraction: 0.25 })
  })
  it('clamps titles at the top', () => {
    expect(levelTitle(1)).toBe('Hatchling')
    expect(levelTitle(500)).toBe('Zen Master')
  })
})

describe('streaks', () => {
  it('formats local day keys', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
  it('counts days across month and leap boundaries', () => {
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })
  it('extends on consecutive days, ignores same-day repeats, resets after a gap', () => {
    let s = bumpStreak(emptyStreak(), '2026-03-01')
    expect(s).toEqual({ count: 1, best: 1, last: '2026-03-01' })
    expect(bumpStreak(s, '2026-03-01')).toBe(s)
    s = bumpStreak(s, '2026-03-02')
    s = bumpStreak(s, '2026-03-03')
    expect(s.count).toBe(3)
    s = bumpStreak(s, '2026-03-06')
    expect(s).toEqual({ count: 1, best: 3, last: '2026-03-06' })
  })
  it('never moves backwards when the clock does', () => {
    const s = bumpStreak(bumpStreak(emptyStreak(), '2026-03-02'), '2026-03-03')
    expect(bumpStreak(s, '2026-03-01')).toBe(s)
  })
  it('lapses for display after a missed day', () => {
    const s = bumpStreak(emptyStreak(), '2026-03-01')
    expect(currentStreak(s, '2026-03-01')).toBe(1)
    expect(currentStreak(s, '2026-03-02')).toBe(1)
    expect(currentStreak(s, '2026-03-03')).toBe(0)
    expect(currentStreak(emptyStreak(), '2026-03-03')).toBe(0)
  })
})

describe('recordActivity', () => {
  it('pays xp once, and never for replays', () => {
    const first = recordActivity(emptyProgress(), ok('a'), ctx, at('2026-03-01'))
    expect(first.progress.xp).toBe(10)
    expect(first.events).toContainEqual({ kind: 'xp', amount: 10 })
    const again = recordActivity(first.progress, ok('a'), ctx, at('2026-03-01'))
    expect(again.progress.xp).toBe(10)
    expect(again.events.some((e) => e.kind === 'xp')).toBe(false)
    expect(again.progress.topics.t).toEqual({ right: 2, wrong: 0 })
  })
  it('records wrong answers without completing or paying', () => {
    const r = recordActivity(emptyProgress(), { id: 'a', topic: 'loops', xp: 10, correct: false }, ctx, at('2026-03-01'))
    expect(r.progress.xp).toBe(0)
    expect(r.progress.completed).toEqual({})
    expect(r.progress.topics.loops).toEqual({ right: 0, wrong: 1 })
    expect(r.progress.streak.count).toBe(1) // studying still counts
  })
  it('emits a level-up exactly when crossing a threshold', () => {
    const p = { ...emptyProgress(), xp: 95 }
    const r = recordActivity(p, ok('a', 10), ctx, at('2026-03-01'))
    expect(r.events).toContainEqual({ kind: 'level', level: 2 })
    const small = recordActivity(emptyProgress(), ok('a', 10), ctx, at('2026-03-01'))
    expect(small.events.some((e) => e.kind === 'level')).toBe(false)
  })
  it('never lets negative xp reduce the total', () => {
    expect(recordActivity(emptyProgress(), ok('a', -50), ctx, at('2026-03-01')).progress.xp).toBe(0)
  })
  it('does not mutate its input', () => {
    const p = emptyProgress()
    const snapshot = JSON.stringify(p)
    recordActivity(p, ok('a'), ctx, at('2026-03-01'))
    expect(JSON.stringify(p)).toBe(snapshot)
  })
})

describe('badges', () => {
  it('awards first-steps and lesson-learner once, at the right moments', () => {
    const a = recordActivity(emptyProgress(), ok('a'), ctx, at('2026-03-01'))
    expect(a.events.filter((e) => e.kind === 'badge')).toEqual([{ kind: 'badge', id: 'first-steps' }])
    const b = recordActivity(a.progress, ok('b'), ctx, at('2026-03-01'))
    expect(b.events.filter((e) => e.kind === 'badge')).toEqual([{ kind: 'badge', id: 'lesson-learner' }])
    const c = recordActivity(b.progress, ok('b'), ctx, at('2026-03-01'))
    expect(c.events.some((e) => e.kind === 'badge')).toBe(false)
  })
  it('awards streak badges from the best streak', () => {
    let p = emptyProgress()
    for (const d of ['2026-03-01', '2026-03-02', '2026-03-03']) p = recordActivity(p, ok(`x${d}`), ctx, at(d)).progress
    expect('on-a-roll' in p.badges).toBe(true)
    expect('week-warrior' in p.badges).toBe(false)
  })
  it('has unique badge ids', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length)
  })
})

describe('bosses & unlocking', () => {
  const metas = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }]
  const content = (id: string) => ({ id, lessons: [{ id: `${id}-l`, activities: [{ id: `${id}-a` }] }] })

  it('pays boss xp only on the first pass and keeps the best score', () => {
    const miss = recordBoss(emptyProgress(), 'r1', 0.5, 0.7, 100, ctx, at('2026-03-01'))
    expect(miss.progress.xp).toBe(0)
    expect(miss.progress.bosses.r1).toMatchObject({ best: 0.5, passed: false })
    const win = recordBoss(miss.progress, 'r1', 0.8, 0.7, 100, ctx, at('2026-03-01'))
    expect(win.progress.xp).toBe(100)
    expect(win.events).toContainEqual({ kind: 'badge', id: 'boss-slayer' })
    const worse = recordBoss(win.progress, 'r1', 0.6, 0.7, 100, ctx, at('2026-03-02'))
    expect(worse.progress.xp).toBe(100)
    expect(worse.progress.bosses.r1).toMatchObject({ best: 0.8, passed: true })
  })
  it('unlocks a region when the previous boss is beaten, or with free roam', () => {
    const p = emptyProgress()
    expect(isUnlocked(p, metas, 0, false)).toBe(true)
    expect(isUnlocked(p, metas, 1, false)).toBe(false)
    expect(isUnlocked(p, metas, 1, true)).toBe(true)
    const won = recordBoss(p, 'r1', 1, 0.7, 0, ctx, at('2026-03-01')).progress
    expect(isUnlocked(won, metas, 1, false)).toBe(true)
    expect(isUnlocked(won, metas, 2, false)).toBe(false)
  })
  it('skips regions that are not authored yet when finding the gate', () => {
    const m = [{ id: 'a' }, { id: 'b', authored: false }, { id: 'c', authored: false }, { id: 'd' }]
    expect(gateRegion(m, 3)?.id).toBe('a')
    expect(gateRegion(m, 0)).toBeUndefined()
    const p = emptyProgress()
    expect(isUnlocked(p, m, 3, false)).toBe(false)
    const won = recordBoss(p, 'a', 1, 0.7, 0, ctx, at('2026-03-01')).progress
    expect(isUnlocked(won, m, 3, false)).toBe(true)
    expect(isUnlocked(p, [{ id: 'x', authored: false }, { id: 'y' }], 1, false)).toBe(true)
  })
  it('derives node states', () => {
    const p = emptyProgress()
    expect(nodeState(p, metas, 0, undefined)).toBe('soon')
    expect(nodeState(p, metas, 0, content('r1'))).toBe('open')
    expect(nodeState(p, metas, 1, content('r2'))).toBe('locked')
    const started = recordActivity(p, ok('r1-a'), ctx, at('2026-03-01')).progress
    expect(nodeState(started, metas, 0, content('r1'))).toBe('started')
    const cleared = recordBoss(started, 'r1', 1, 0.7, 0, ctx, at('2026-03-01')).progress
    expect(nodeState(cleared, metas, 0, content('r1'))).toBe('cleared')
    expect(nodeState(cleared, metas, 1, content('r2'))).toBe('open')
  })
})

describe('save files', () => {
  it('round-trips', () => {
    const p = recordActivity(emptyProgress(), ok('a'), ctx, at('2026-03-01')).progress
    expect(parseProgress(JSON.stringify(p))).toEqual(p)
  })
  it('fills default settings for older saves', () => {
    const { settings: _s, ...old } = emptyProgress()
    expect(parseProgress(JSON.stringify(old)).settings).toEqual({ theme: 'system', freeRoam: false, sound: false, motion: true })
  })
  it('fills the sound and motion switches for saves that only had a theme and free roam', () => {
    const older = { ...emptyProgress(), settings: { theme: 'dark', freeRoam: true } }
    expect(parseProgress(JSON.stringify(older)).settings).toEqual({ theme: 'dark', freeRoam: true, sound: false, motion: true })
  })
  it('rejects garbage and wrong shapes with friendly messages', () => {
    expect(() => parseProgress('not json')).toThrow(/valid JSON/)
    expect(() => parseProgress('{"version":2}')).toThrow(/save file/)
    expect(() => parseProgress(JSON.stringify({ ...emptyProgress(), xp: -5 }))).toThrow(/save file/)
  })
})
