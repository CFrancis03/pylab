export interface Streak {
  count: number
  best: number
  /** Local calendar day of the last study activity, `YYYY-MM-DD`. */
  last: string | null
}

export const emptyStreak = (): Streak => ({ count: 0, best: 0, last: null })

/** Local-time calendar day key. Streaks follow the learner's own midnight, not UTC. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

/** Record study activity on `today`. */
export function bumpStreak(s: Streak, today: string): Streak {
  if (s.last === today) return s
  // A clock set backwards must never break or extend a streak.
  if (s.last !== null && daysBetween(s.last, today) < 0) return s
  const count = s.last !== null && daysBetween(s.last, today) === 1 ? s.count + 1 : 1
  return { count, best: Math.max(s.best, count), last: today }
}

/** The streak to display: it lapses once a whole day has been missed. */
export function currentStreak(s: Streak, today: string): number {
  if (s.last === null) return 0
  return daysBetween(s.last, today) <= 1 ? s.count : 0
}
