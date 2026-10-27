import { z } from 'zod'
import { badgesEarnedBy, type BadgeCtx } from './badges'
import { levelForXp } from './xp'
import { bumpStreak, dayKey, emptyStreak } from './streak'

export const THEMES = ['system', 'light', 'dark'] as const

export const progressSchema = z.object({
  version: z.literal(1),
  xp: z.number().int().nonnegative(),
  /** Activities answered correctly at least once. */
  completed: z.record(z.string(), z.object({ at: z.number(), xp: z.number() })),
  /** Right/wrong counts per topic tag. Drives review mode. */
  topics: z.record(
    z.string(),
    z.object({ right: z.number().int().nonnegative(), wrong: z.number().int().nonnegative() }),
  ),
  bosses: z.record(
    z.string(),
    z.object({ best: z.number().min(0).max(1), passed: z.boolean(), at: z.number() }),
  ),
  streak: z.object({
    count: z.number().int().nonnegative(),
    best: z.number().int().nonnegative(),
    last: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  }),
  badges: z.record(z.string(), z.number()),
  /** Flashcard scheduling: Leitner box and next-due day, keyed `activityId#index`. */
  cards: z.record(z.string(), z.object({ box: z.number().int().min(0).max(5), due: z.string() })).default({}),
  settings: z
    .object({ theme: z.enum(THEMES), freeRoam: z.boolean() })
    .default({ theme: 'system', freeRoam: false }),
})

export type Progress = z.infer<typeof progressSchema>
export type Settings = Progress['settings']

export type GameEvent =
  | { kind: 'xp'; amount: number }
  | { kind: 'level'; level: number }
  | { kind: 'badge'; id: string }
  | { kind: 'streak'; count: number }

export interface Outcome {
  progress: Progress
  events: GameEvent[]
}

export const emptyProgress = (): Progress => ({
  version: 1,
  xp: 0,
  completed: {},
  topics: {},
  bosses: {},
  streak: emptyStreak(),
  badges: {},
  cards: {},
  settings: { theme: 'system', freeRoam: false },
})

export function parseProgress(text: string): Progress {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const r = progressSchema.safeParse(raw)
  if (!r.success) throw new Error('That does not look like a Python Lab save file.')
  return r.data
}

export interface ActivityResult {
  id: string
  topic: string
  xp: number
  correct: boolean
}

/** Shared tail: award XP, then streak, level-up and badge events. */
function award(p: Progress, amount: number, ctx: BadgeCtx, now: Date, events: GameEvent[]): Progress {
  let next = p
  if (amount > 0) {
    const before = levelForXp(next.xp)
    next = { ...next, xp: next.xp + amount }
    events.push({ kind: 'xp', amount })
    const after = levelForXp(next.xp)
    if (after > before) events.push({ kind: 'level', level: after })
  }
  const streak = bumpStreak(next.streak, dayKey(now))
  if (streak.count > next.streak.count) events.push({ kind: 'streak', count: streak.count })
  next = { ...next, streak }

  const fresh = badgesEarnedBy(next, ctx)
  if (fresh.length) {
    next = { ...next, badges: { ...next.badges, ...Object.fromEntries(fresh.map((id) => [id, now.getTime()])) } }
    for (const id of fresh) events.push({ kind: 'badge', id })
  }
  return next
}

/**
 * Record one attempt. XP is paid only the first time an activity is answered correctly,
 * so replaying for practice is free but cannot be farmed.
 */
export function recordActivity(p: Progress, a: ActivityResult, ctx: BadgeCtx, now: Date): Outcome {
  const events: GameEvent[] = []
  const t = p.topics[a.topic] ?? { right: 0, wrong: 0 }
  let next: Progress = {
    ...p,
    topics: { ...p.topics, [a.topic]: a.correct ? { ...t, right: t.right + 1 } : { ...t, wrong: t.wrong + 1 } },
  }
  let amount = 0
  if (a.correct && !next.completed[a.id]) {
    amount = Math.max(0, a.xp)
    next = { ...next, completed: { ...next.completed, [a.id]: { at: now.getTime(), xp: amount } } }
  }
  return { progress: award(next, amount, ctx, now, events), events }
}

/** Record a boss attempt. `bossXp` is paid on the first pass only. */
export function recordBoss(
  p: Progress,
  regionId: string,
  score: number,
  passMark: number,
  bossXp: number,
  ctx: BadgeCtx,
  now: Date,
): Outcome {
  const events: GameEvent[] = []
  const prev = p.bosses[regionId]
  const passed = score >= passMark
  const first = passed && !prev?.passed
  const next: Progress = {
    ...p,
    bosses: {
      ...p.bosses,
      [regionId]: { best: Math.max(prev?.best ?? 0, score), passed: passed || !!prev?.passed, at: now.getTime() },
    },
  }
  return { progress: award(next, first ? bossXp : 0, ctx, now, events), events }
}
