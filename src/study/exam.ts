import type { QuizItem } from './items'
import { shuffle, type Rng } from './rng'

export const EXAM_SIZES = [10, 20, 30] as const
/** Time limits in minutes. 0 means untimed. */
export const EXAM_MINUTES = [0, 15, 30, 45] as const

/** A sensible default time limit for a number of questions: about 1.5 minutes each. */
export const suggestedMinutes = (size: number): number => EXAM_MINUTES.find((m) => m >= size * 1.5) ?? 45

const TYPE_PATTERN: QuizItem['activity']['type'][] = ['mcq', 'predict-output', 'mcq', 'spot-bug']

/**
 * A mixed exam: questions spread evenly across the chosen regions and across question types
 * (some multiple choice, some predict-the-output, some find-the-bug), then shuffled.
 */
export function pickExam(items: QuizItem[], regionIds: string[], size: number, rng: Rng): QuizItem[] {
  const regions = shuffle(regionIds, rng).map((id) => {
    const mine = shuffle(items.filter((i) => i.regionId === id), rng)
    const byType = new Map<string, QuizItem[]>()
    for (const i of mine) byType.set(i.activity.type, [...(byType.get(i.activity.type) ?? []), i])
    return { byType, taken: 0 }
  })
  const out: QuizItem[] = []
  let turn = 0
  while (out.length < size && regions.some((r) => [...r.byType.values()].some((q) => q.length > 0))) {
    const r = regions[turn % regions.length]
    turn++
    // Prefer the type the rotation asks for, then fall back to whatever this region still has.
    const want = TYPE_PATTERN[r.taken % TYPE_PATTERN.length]
    const queue = r.byType.get(want)?.length ? r.byType.get(want) : [...r.byType.values()].find((q) => q.length > 0)
    const next = queue?.shift()
    if (next) {
      out.push(next)
      r.taken++
    }
  }
  return shuffle(out, rng)
}

export interface Answer {
  id: string
  topic: string
  correct: boolean
}

export function scoreExam(answers: Answer[], total: number): { correct: number; total: number; score: number } {
  const correct = answers.filter((a) => a.correct).length
  return { correct, total, score: total === 0 ? 0 : correct / total }
}

/** Right and wrong per topic, counting unanswered questions as wrong. Weakest topic first. */
export function topicBreakdown(items: QuizItem[], answers: Answer[]): { topic: string; right: number; wrong: number }[] {
  const byId = new Map(answers.map((a) => [a.id, a.correct]))
  const topics = new Map<string, { right: number; wrong: number }>()
  for (const i of items) {
    const t = topics.get(i.topic) ?? { right: 0, wrong: 0 }
    if (byId.get(i.id)) t.right++
    else t.wrong++
    topics.set(i.topic, t)
  }
  return [...topics.entries()]
    .map(([topic, t]) => ({ topic, ...t }))
    .sort((a, b) => a.right / (a.right + a.wrong) - b.right / (b.right + b.wrong) || a.topic.localeCompare(b.topic))
}
