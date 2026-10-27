import { describe, expect, it } from 'vitest'
import { regions } from '../content'
import { BADGES, type BadgeCtx } from '../game/badges'
import { emptyProgress, parseProgress, recordActivity, recordExam, recordPractice, type Progress } from '../game/progress'
import { buildSheet } from './cheatsheet'
import { boxCounts, buildDeck, DEFAULT_SESSION, planSession, waitingCount } from './deck'
import { pickExam, scoreExam, suggestedMinutes, topicBreakdown } from './exam'
import { itemHref, quizItems } from './items'
import { mulberry32, shuffle, weightedSample } from './rng'
import { prettyTopic, topicHomes } from './topics'
import { isStudied, overallAccuracy, pickReview, priority, smoothed, troubleCount, weakTopics } from './weakness'

const ctx: BadgeCtx = { lessons: {} }
const now = new Date('2026-03-01T12:00:00')
const items = quizItems(regions)

const withTopics = (t: Progress['topics']): Progress => ({ ...emptyProgress(), topics: t })

describe('rng', () => {
  it('is deterministic for a seed and shuffles without losing items', () => {
    expect(mulberry32(1)()).toBe(mulberry32(1)())
    const xs = [1, 2, 3, 4, 5, 6]
    const s = shuffle(xs, mulberry32(7))
    expect([...s].sort()).toEqual(xs)
    expect(s).not.toEqual(xs)
  })
  it('weighted sampling returns distinct items and respects zero weights', () => {
    const picked = weightedSample(['a', 'b', 'c', 'd'], (x) => (x === 'a' ? 0 : 1), 3, mulberry32(3))
    expect(new Set(picked).size).toBe(3)
    expect(picked).not.toContain('a')
    expect(weightedSample(['x'], () => 1, 5, mulberry32(1))).toEqual(['x'])
  })
})

describe('content items', () => {
  it('collects lesson and boss questions of the three quick types', () => {
    expect(items.length).toBeGreaterThan(300)
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    expect(items.every((i) => ['mcq', 'predict-output', 'spot-bug'].includes(i.activity.type))).toBe(true)
    expect(items.some((i) => i.lessonId === null)).toBe(true)
    expect(itemHref(items[0])).toContain('/region/')
  })
  it('prettifies topics and finds where each is taught', () => {
    expect(prettyTopic('regex-groups')).toBe('Regex groups')
    const homes = topicHomes(regions)
    expect(homes.get('dicts')?.regionId).toBe('hash-harbor')
  })
})

describe('weakness', () => {
  it('smooths accuracy so unseen is 50% and a little data moves it gently', () => {
    expect(smoothed(0, 0)).toBe(0.5)
    expect(smoothed(1, 0)).toBeCloseTo(2 / 3)
    expect(smoothed(0, 3)).toBeCloseTo(0.2)
  })
  it('ranks topics weakest first and ignores unanswered ones', () => {
    const p = withTopics({ strong: { right: 9, wrong: 1 }, weak: { right: 1, wrong: 6 }, untouched: { right: 0, wrong: 0 } })
    expect(weakTopics(p).map((t) => t.topic)).toEqual(['weak', 'strong'])
    expect(weakTopics(p, 1)).toHaveLength(1)
  })
  it('gives higher priority to missed questions in weak topics', () => {
    const it0 = items[0]
    const p: Progress = {
      ...emptyProgress(),
      topics: { [it0.topic]: { right: 0, wrong: 5 } },
      items: { [it0.id]: { right: 0, wrong: 3, last: 1 } },
    }
    const q = items.find((i) => i.topic !== it0.topic)!
    expect(priority(p, it0)).toBeGreaterThan(priority(p, q))
  })
  it('limits "studied" scope to questions the learner has met', () => {
    const p: Progress = { ...emptyProgress(), items: { [items[3].id]: { right: 1, wrong: 0, last: 1 } } }
    expect(isStudied(p, items[3])).toBe(true)
    expect(isStudied(p, items[4])).toBe(false)
    const picked = pickReview(items, p, 10, mulberry32(2), 'studied')
    expect(picked.map((i) => i.id)).toEqual([items[3].id])
    expect(pickReview(items, p, 10, mulberry32(2), 'all')).toHaveLength(10)
  })
  it('prefers weak topics when sampling', () => {
    const weak = items[0].topic
    const p = withTopics({ [weak]: { right: 0, wrong: 12 } })
    for (const t of new Set(items.map((i) => i.topic))) if (t !== weak) p.topics[t] = { right: 12, wrong: 0 }
    let weakPicked = 0
    let total = 0
    for (let seed = 1; seed <= 30; seed++) {
      const picked = pickReview(items, p, 5, mulberry32(seed), 'all')
      weakPicked += picked.filter((i) => i.topic === weak).length
      total += picked.length
    }
    const share = items.filter((i) => i.topic === weak).length / items.length
    expect(weakPicked / total).toBeGreaterThan(share * 3)
  })
  it('counts trouble questions and overall accuracy', () => {
    const p: Progress = { ...withTopics({ a: { right: 3, wrong: 1 } }), items: { x: { right: 0, wrong: 2, last: 0 }, y: { right: 3, wrong: 0, last: 0 } } }
    expect(troubleCount(p)).toBe(1)
    expect(overallAccuracy(p)).toBe(0.75)
    expect(overallAccuracy(emptyProgress())).toBeNull()
  })
})

describe('mock exam', () => {
  const ids = ['hash-harbor', 'string-bazaar', 'regex-jungle']
  it('picks the requested number, only from the chosen regions, spread across them and across types', () => {
    const exam = pickExam(items, ids, 20, mulberry32(5))
    expect(exam).toHaveLength(20)
    expect(new Set(exam.map((i) => i.id)).size).toBe(20)
    expect(exam.every((i) => ids.includes(i.regionId))).toBe(true)
    for (const id of ids) expect(exam.filter((i) => i.regionId === id).length).toBeGreaterThanOrEqual(6)
    expect(new Set(exam.map((i) => i.activity.type)).size).toBeGreaterThanOrEqual(3)
  })
  it('returns everything available when asked for more than exists', () => {
    const all = items.filter((i) => i.regionId === 'snake-nest')
    expect(pickExam(items, ['snake-nest'], 999, mulberry32(1))).toHaveLength(all.length)
    expect(pickExam(items, [], 10, mulberry32(1))).toEqual([])
  })
  it('scores and breaks results down by topic, counting unanswered as wrong', () => {
    const exam = items.slice(0, 4)
    const answers = [{ id: exam[0].id, topic: exam[0].topic, correct: true }, { id: exam[1].id, topic: exam[1].topic, correct: false }]
    expect(scoreExam(answers, 4)).toEqual({ correct: 1, total: 4, score: 0.25 })
    expect(scoreExam([], 0).score).toBe(0)
    const b = topicBreakdown(exam, answers)
    expect(b.reduce((n, t) => n + t.right + t.wrong, 0)).toBe(4)
    expect(b.reduce((n, t) => n + t.right, 0)).toBe(1)
  })
  it('suggests about 1.5 minutes per question', () => {
    expect([10, 20, 30].map(suggestedMinutes)).toEqual([15, 30, 45])
  })
})

describe('daily flashcards', () => {
  const deck = buildDeck(regions)
  it('builds a deck of keyed cards', () => {
    expect(deck.length).toBeGreaterThan(80)
    expect(new Set(deck.map((c) => c.key)).size).toBe(deck.length)
  })
  it('introduces only a few new cards, with due reviews first', () => {
    const plan = planSession(deck, {}, '2026-03-01')
    expect(plan.cards).toHaveLength(DEFAULT_SESSION.newLimit)
    expect(plan.dueTotal).toBe(0)
    expect(plan.newTotal).toBe(deck.length)
    const state = { [deck[0].key]: { box: 2, due: '2026-02-27' }, [deck[1].key]: { box: 1, due: '2026-03-05' }, [deck[2].key]: { box: 0, due: '2026-03-01' } }
    const p2 = planSession(deck, state, '2026-03-01')
    expect(p2.cards.slice(0, 2).map((c) => c.key)).toEqual([deck[0].key, deck[2].key])
    expect(p2.cards.map((c) => c.key)).not.toContain(deck[1].key)
    expect(p2.dueTotal).toBe(2)
    expect(p2.cards).toHaveLength(2 + DEFAULT_SESSION.newLimit)
  })
  it('caps the whole session and reports what is waiting', () => {
    const state = Object.fromEntries(deck.map((c) => [c.key, { box: 1, due: '2026-01-01' }]))
    expect(planSession(deck, state, '2026-03-01').cards).toHaveLength(DEFAULT_SESSION.maxTotal)
    expect(waitingCount(deck, {}, '2026-03-01')).toBe(DEFAULT_SESSION.newLimit)
  })
  it('counts cards per box', () => {
    const c = boxCounts(deck, { [deck[0].key]: { box: 3, due: 'x' } }, 6)
    expect(c[3]).toBe(1)
    expect(c.reduce((a, b) => a + b, 0)).toBe(deck.length)
  })
})

describe('cheat sheet', () => {
  it('collects concept cards and facts for the chosen regions in map order', () => {
    const sheet = buildSheet(regions, ['string-bazaar', 'snake-nest'])
    expect(sheet.map((s) => s.regionId)).toEqual(['snake-nest', 'string-bazaar'])
    expect(sheet.every((s) => s.concepts.length > 0 && s.facts.length > 0)).toBe(true)
    expect(buildSheet(regions, [])).toEqual([])
  })
})

describe('practice and exam recording', () => {
  it('counts practice answers on topics and per question, pays no XP and completes nothing', () => {
    const out = recordPractice(emptyProgress(), { id: 'q1', topic: 'dicts', correct: false }, ctx, now)
    expect(out.progress.xp).toBe(0)
    expect(out.progress.completed).toEqual({})
    expect(out.progress.topics.dicts).toEqual({ right: 0, wrong: 1 })
    expect(out.progress.items.q1.wrong).toBe(1)
    expect(out.progress.practice).toBe(1)
    expect(out.progress.streak.count).toBe(1)
  })
  it('tracks every lesson attempt per activity too', () => {
    let p = emptyProgress()
    p = recordActivity(p, { id: 'a', topic: 't', xp: 10, correct: false }, ctx, now).progress
    p = recordActivity(p, { id: 'a', topic: 't', xp: 10, correct: true }, ctx, now).progress
    expect(p.items.a).toMatchObject({ right: 1, wrong: 1 })
    expect(p.xp).toBe(10)
  })
  it('remembers only the last 20 exams and awards the badges', () => {
    let p = emptyProgress()
    for (let i = 0; i < 22; i++) p = recordExam(p, { correct: 9, total: 10, seconds: 60, regions: ['a'] }, ctx, new Date(now.getTime() + i)).progress
    expect(p.exams).toHaveLength(20)
    expect(p.badges['exam-ready']).toBeDefined()
    let q = emptyProgress()
    for (let i = 0; i < 25; i++) q = recordPractice(q, { id: `q${i}`, topic: 't', correct: true }, ctx, now).progress
    expect(q.badges.reviewer).toBeDefined()
    expect(BADGES.map((b) => b.id)).toEqual(expect.arrayContaining(['reviewer', 'exam-ready', 'card-sharp']))
  })
  it('still loads a save written before these fields existed', () => {
    const old = { version: 1, xp: 5, completed: {}, topics: {}, bosses: {}, streak: { count: 0, best: 0, last: null }, badges: {} }
    const p = parseProgress(JSON.stringify(old))
    expect(p.items).toEqual({})
    expect(p.exams).toEqual([])
    expect(p.practice).toBe(0)
    expect(p.cards).toEqual({})
  })
})
