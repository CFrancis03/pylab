import type { Region } from '../content/schema'
import { isDue, type CardState } from '../game/srs'

export interface DeckCard {
  /** `activityId#index`, the key the schedule is stored under. */
  key: string
  regionId: string
  regionName: string
  lessonId: string
  topic: string
  front: string
  back: string
}

/** Every flashcard in the authored content. */
export function buildDeck(regions: Region[]): DeckCard[] {
  const deck: DeckCard[] = []
  for (const r of regions) {
    for (const l of r.lessons) {
      for (const a of l.activities) {
        if (a.type !== 'flashcards') continue
        a.cards.forEach((c, i) => deck.push({ key: `${a.id}#${i}`, regionId: r.id, regionName: r.name, lessonId: l.id, topic: a.topic, front: c.front, back: c.back }))
      }
    }
  }
  return deck
}

export interface SessionOptions {
  /** Brand-new cards introduced per session. */
  newLimit: number
  /** Cap on the whole session. */
  maxTotal: number
}

export const DEFAULT_SESSION: SessionOptions = { newLimit: 10, maxTotal: 30 }

export interface SessionPlan {
  cards: DeckCard[]
  /** Scheduled cards that are due today (before the session cap). */
  dueTotal: number
  /** Cards never seen before (before the daily new-card cap). */
  newTotal: number
}

/** Today's deck: scheduled cards that are due (oldest and weakest first), then a few new ones. */
export function planSession(deck: DeckCard[], state: Record<string, CardState>, today: string, opts: SessionOptions = DEFAULT_SESSION): SessionPlan {
  const due = deck
    .filter((c) => state[c.key] !== undefined && isDue(state[c.key], today))
    .sort((a, b) => state[a.key].due.localeCompare(state[b.key].due) || state[a.key].box - state[b.key].box || a.key.localeCompare(b.key))
  const fresh = deck.filter((c) => state[c.key] === undefined)
  const takenDue = due.slice(0, opts.maxTotal)
  const takenNew = fresh.slice(0, Math.max(0, Math.min(opts.newLimit, opts.maxTotal - takenDue.length)))
  return { cards: [...takenDue, ...takenNew], dueTotal: due.length, newTotal: fresh.length }
}

/** How many cards are waiting for today, as a number for a badge. */
export const waitingCount = (deck: DeckCard[], state: Record<string, CardState>, today: string): number =>
  planSession(deck, state, today).cards.length

/** Number of deck cards in each Leitner box (index 0 is "new or just forgotten"). */
export function boxCounts(deck: DeckCard[], state: Record<string, CardState>, boxes: number): number[] {
  const out = new Array<number>(boxes).fill(0)
  for (const c of deck) out[Math.min(state[c.key]?.box ?? 0, boxes - 1)]++
  return out
}
