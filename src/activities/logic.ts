/** Output comparison ignores trailing whitespace on each line and at the end. */
export function normalizeOutput(s: string): string {
  return s.replace(/\r/g, '').split('\n').map((l) => l.trimEnd()).join('\n').trim()
}

export function isMcqCorrect(answer: number | number[], picked: number[]): boolean {
  const want = (Array.isArray(answer) ? answer : [answer]).slice().sort((a, b) => a - b)
  const got = [...new Set(picked)].sort((a, b) => a - b)
  return want.length === got.length && want.every((v, i) => v === got[i])
}

export const checkParsons = (solution: string[], built: string[]): boolean =>
  solution.length === built.length && solution.every((l, i) => l === built[i])

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261)

/**
 * Deterministic shuffle: the same key always gives the same order, so a puzzle does not
 * reshuffle on re-render. The result never equals the input order (when length > 1).
 */
export function shuffleSeeded<T>(items: T[], key: string): T[] {
  if (items.length < 2) return items.slice()
  const rand = mulberry32(hash(key))
  let out: T[] = items.slice()
  for (let attempt = 0; attempt < 8; attempt++) {
    out = items.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    if (out.some((v, i) => v !== items[i])) return out
  }
  return [...items.slice(1), items[0]]
}

export const bossScore = (correct: number, total: number): number => (total === 0 ? 0 : correct / total)
