export type Region = 'onlyA' | 'both' | 'onlyB'

export const REGIONS: Region[] = ['onlyA', 'both', 'onlyB']

export interface VennLevel {
  id: string
  /** `shade`: colour the regions the expression selects. `name`: pick the expression that selects the shaded regions. */
  mode: 'shade' | 'name'
  A: number[]
  B: number[]
  /** The expression, as Python. For `shade` levels it is shown; for `name` levels it is the right choice. */
  expr: string
  /** The regions the expression selects. Verified against real Python sets by validate-content. */
  answer: Region[]
  /** Choices for `name` levels. */
  options?: string[]
  note: string
}

const A = [1, 2, 3, 4]
const B = [3, 4, 5]

export const VENN_LEVELS: VennLevel[] = [
  { id: 'vn-and', mode: 'shade', A, B, expr: 'A & B', answer: ['both'], note: '& is intersection: only items in both sets. Also A.intersection(B).' },
  { id: 'vn-or', mode: 'shade', A, B, expr: 'A | B', answer: ['onlyA', 'both', 'onlyB'], note: '| is union: everything in either set. Also A.union(B).' },
  { id: 'vn-sub', mode: 'shade', A, B, expr: 'A - B', answer: ['onlyA'], note: 'A - B keeps what is in A but not in B. Also A.difference(B).' },
  { id: 'vn-sub2', mode: 'shade', A, B, expr: 'B - A', answer: ['onlyB'], note: 'Difference is not symmetric: B - A is a different set from A - B.' },
  { id: 'vn-xor', mode: 'shade', A, B, expr: 'A ^ B', answer: ['onlyA', 'onlyB'], note: '^ is symmetric difference: in exactly one of the two. Also A.symmetric_difference(B).' },
  { id: 'vn-name1', mode: 'name', A, B, expr: 'A ^ B', answer: ['onlyA', 'onlyB'], options: ['A & B', 'A | B', 'A - B', 'A ^ B'], note: 'The shaded part is everything except the overlap, which is exactly A ^ B.' },
  { id: 'vn-name2', mode: 'name', A, B, expr: 'A & B', answer: ['both'], options: ['A & B', 'A | B', 'A - B', 'B - A'], note: 'Only the overlap is shaded: intersection.' },
  { id: 'vn-combo', mode: 'shade', A, B, expr: '(A | B) - (A & B)', answer: ['onlyA', 'onlyB'], note: 'Union minus intersection is the same as A ^ B.' },
]

/** Elements of each region for a level. */
export function regionItems(l: Pick<VennLevel, 'A' | 'B'>): Record<Region, number[]> {
  return {
    onlyA: l.A.filter((x) => !l.B.includes(x)),
    both: l.A.filter((x) => l.B.includes(x)),
    onlyB: l.B.filter((x) => !l.A.includes(x)),
  }
}

/** The set a list of regions selects, sorted. */
export function itemsOf(l: Pick<VennLevel, 'A' | 'B'>, regions: Region[]): number[] {
  const r = regionItems(l)
  return regions.flatMap((x) => r[x]).sort((a, b) => a - b)
}

export const sameRegions = (a: Region[], b: Region[]): boolean => a.length === b.length && a.every((x) => b.includes(x))
