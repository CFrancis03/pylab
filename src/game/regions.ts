import type { Progress } from './progress'

/** The slice of a region the map needs. Full content is optional until it is authored. */
export interface RegionRef {
  id: string
  /** False for regions whose lessons are not written yet. They can never be beaten, so they never gate. */
  authored?: boolean
}

export interface ContentRef {
  id: string
  lessons: { id: string; activities: { id: string }[] }[]
}

export type NodeState = 'soon' | 'locked' | 'open' | 'started' | 'cleared'

/** The nearest earlier authored region: its boss is what must be beaten to enter `index`. */
export function gateRegion(metas: RegionRef[], index: number): RegionRef | undefined {
  for (let i = index - 1; i >= 0; i--) if (metas[i].authored !== false) return metas[i]
  return undefined
}

export function isUnlocked(p: Progress, metas: RegionRef[], index: number, freeRoam: boolean): boolean {
  if (freeRoam) return true
  const gate = gateRegion(metas, index)
  return gate === undefined || !!p.bosses[gate.id]?.passed
}

export function countDone(p: Progress, ids: string[]): { done: number; total: number } {
  return { done: ids.filter((id) => id in p.completed).length, total: ids.length }
}

export const regionActivityIds = (c: ContentRef): string[] => c.lessons.flatMap((l) => l.activities.map((a) => a.id))

export function nodeState(p: Progress, metas: RegionRef[], index: number, content: ContentRef | undefined): NodeState {
  if (!content) return 'soon'
  if (p.bosses[content.id]?.passed) return 'cleared'
  if (!isUnlocked(p, metas, index, p.settings.freeRoam)) return 'locked'
  return countDone(p, regionActivityIds(content)).done > 0 ? 'started' : 'open'
}
