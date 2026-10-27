import type { Mcq, PredictOutput, Region, SpotBug } from '../content/schema'

/** The question types that can be asked and graded one at a time, anywhere, without a code editor. */
export type QuizActivity = Mcq | PredictOutput | SpotBug

export interface QuizItem {
  id: string
  regionId: string
  regionName: string
  /** Null for boss-battle questions. */
  lessonId: string | null
  topic: string
  activity: QuizActivity
}

/** Every quiz-style question in the authored content, lesson activities and boss questions alike. */
export function quizItems(regions: Region[]): QuizItem[] {
  const out: QuizItem[] = []
  for (const r of regions) {
    const base = { regionId: r.id, regionName: r.name }
    for (const l of r.lessons) {
      for (const a of l.activities) {
        if (a.type === 'mcq' || a.type === 'predict-output' || a.type === 'spot-bug') out.push({ ...base, id: a.id, lessonId: l.id, topic: a.topic, activity: a })
      }
    }
    for (const q of r.boss.questions) out.push({ ...base, id: q.id, lessonId: null, topic: q.topic, activity: q })
  }
  return out
}

/** Where to send a learner who wants to revisit the material behind a question. */
export const itemHref = (i: Pick<QuizItem, 'regionId' | 'lessonId'>): string =>
  i.lessonId ? `/region/${i.regionId}/lesson/${i.lessonId}` : `/region/${i.regionId}`

/** A one-line description of a question, for result lists. */
export function itemTitle(i: QuizItem): string {
  const a = i.activity
  if (a.type === 'mcq') return a.question
  if (a.type === 'spot-bug') return a.prompt
  return `Predict the output: ${a.code.split('\n')[0]}${a.code.includes('\n') ? ' …' : ''}`
}
