import { dayKey } from './streak'

export interface CardState {
  box: number
  due: string
}

/** Days until the next review for each Leitner box (box 0 = new or just forgotten). */
export const INTERVALS = [0, 1, 3, 7, 14, 30]

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n))
}

/** Knowing a card moves it up a box; forgetting sends it back to box 0, due again today. */
export function rateCard(card: CardState | undefined, known: boolean, today: string): CardState {
  if (!known) return { box: 0, due: today }
  const box = Math.min((card?.box ?? 0) + 1, INTERVALS.length - 1)
  return { box, due: addDays(today, INTERVALS[box]) }
}

export const isDue = (card: CardState | undefined, today: string): boolean => !card || card.due <= today
