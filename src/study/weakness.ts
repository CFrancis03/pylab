import type { Progress } from '../game/progress'
import type { QuizItem } from './items'
import { weightedSample, type Rng } from './rng'

/** Accuracy with a pinch of prior (Laplace): an unseen thing counts as 50%, and a few answers move it only a little. */
export const smoothed = (right: number, wrong: number): number => (right + 1) / (right + wrong + 2)

export const topicAccuracy = (p: Progress, topic: string): number => {
  const t = p.topics[topic]
  return smoothed(t?.right ?? 0, t?.wrong ?? 0)
}

export const itemAccuracy = (p: Progress, id: string): number => {
  const s = p.items[id]
  return smoothed(s?.right ?? 0, s?.wrong ?? 0)
}

/** Has the learner met this question (answered it in a lesson, review or exam, or fought the boss it belongs to)? */
export const isStudied = (p: Progress, i: QuizItem): boolean =>
  i.id in p.completed || i.id in p.items || (i.lessonId === null && i.regionId in p.bosses)

/** 0 (solid) to 1 (weak): how badly this question deserves another look. Equal parts the topic and the question itself. */
export const priority = (p: Progress, i: QuizItem): number => 0.5 * (1 - topicAccuracy(p, i.topic)) + 0.5 * (1 - itemAccuracy(p, i.id))

export type ReviewScope = 'studied' | 'all'

/** Questions for a review session, drawn at random but heavily biased toward weak topics and missed questions. */
export function pickReview(items: QuizItem[], p: Progress, n: number, rng: Rng, scope: ReviewScope): QuizItem[] {
  const eligible = scope === 'studied' ? items.filter((i) => isStudied(p, i)) : items
  return weightedSample(eligible, (i) => priority(p, i) ** 2 + 0.03, n, rng)
}

export interface TopicStat {
  topic: string
  right: number
  wrong: number
  accuracy: number
}

/** Topics the learner has answered, weakest first. */
export function weakTopics(p: Progress, limit = Infinity): TopicStat[] {
  return Object.entries(p.topics)
    .filter(([, t]) => t.right + t.wrong > 0)
    .map(([topic, t]) => ({ topic, right: t.right, wrong: t.wrong, accuracy: smoothed(t.right, t.wrong) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.right + b.wrong - (a.right + a.wrong) || a.topic.localeCompare(b.topic))
    .slice(0, limit)
}

/** Questions that have been missed more often than answered correctly. */
export const troubleCount = (p: Progress): number => Object.values(p.items).filter((s) => s.wrong > s.right).length

/** Overall share of answers that were right, or null before any answer. */
export function overallAccuracy(p: Progress): number | null {
  let right = 0
  let wrong = 0
  for (const t of Object.values(p.topics)) {
    right += t.right
    wrong += t.wrong
  }
  return right + wrong === 0 ? null : right / (right + wrong)
}
