/** Cumulative XP needed to reach `level` (level 1 needs 0): 0, 100, 300, 600, 1000, ... */
export const xpForLevel = (level: number): number => 50 * level * (level - 1)

export function levelForXp(xp: number): number {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  return level
}

export interface LevelProgress {
  level: number
  /** XP earned inside the current level. */
  into: number
  /** XP the current level spans. */
  span: number
  fraction: number
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp)
  const base = xpForLevel(level)
  const span = xpForLevel(level + 1) - base
  return { level, into: xp - base, span, fraction: (xp - base) / span }
}

const TITLES = [
  'Hatchling', 'Slitherer', 'Coiler', 'Constrictor', 'Viper',
  'Cobra', 'Anaconda', 'Python', 'Pythonista', 'Zen Master',
]

export const levelTitle = (level: number): string => TITLES[Math.min(level, TITLES.length) - 1]

/** Each hint used costs 25% of an activity's XP, but a correct answer is always worth at least 1. */
export const xpAfterHints = (base: number, hintsUsed: number): number =>
  Math.max(1, Math.round(base * Math.max(0.25, 1 - 0.25 * hintsUsed)))
