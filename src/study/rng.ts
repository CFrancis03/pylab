export type Rng = () => number

/** Small seeded generator so picking logic can be tested deterministically. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pick up to `n` distinct items, each draw proportional to its weight. */
export function weightedSample<T>(xs: readonly T[], weight: (x: T) => number, n: number, rng: Rng): T[] {
  const pool = [...xs]
  const out: T[] = []
  while (out.length < n && pool.length > 0) {
    const weights = pool.map((x) => Math.max(0, weight(x)))
    const total = weights.reduce((s, w) => s + w, 0)
    let r = rng() * total
    let k = 0
    if (total > 0) while (k < pool.length - 1 && (r -= weights[k]) >= 0) k++
    else k = Math.floor(rng() * pool.length)
    out.push(pool.splice(k, 1)[0])
  }
  return out
}
