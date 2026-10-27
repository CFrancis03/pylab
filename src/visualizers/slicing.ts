/** Mirrors CPython's `slice.indices(len)` followed by iterating the resulting range. */
export function sliceIndices(len: number, start: number | null, stop: number | null, step: number | null): number[] {
  const st = step ?? 1
  if (st === 0) throw new RangeError('slice step cannot be zero')
  const lower = st > 0 ? 0 : -1
  const upper = st > 0 ? len : len - 1
  const clamp = (v: number | null, dflt: number): number => {
    if (v === null) return dflt
    if (v < 0) return Math.max(v + len, lower)
    return Math.min(v, upper)
  }
  const a = clamp(start, st > 0 ? lower : upper)
  const b = clamp(stop, st > 0 ? upper : lower)
  const out: number[] = []
  if (st > 0) for (let i = a; i < b; i += st) out.push(i)
  else for (let i = a; i > b; i += st) out.push(i)
  return out
}

/** One text box of a slice: blank means omitted, otherwise it must be a whole number. */
export function parseSliceField(text: string): number | null | 'invalid' {
  const t = text.trim()
  if (t === '') return null
  return /^[+-]?\d+$/.test(t) ? Number(t) : 'invalid'
}

/** The slice written as Python would, with omitted parts left blank: `s[1:6:2]`, `s[::-1]`. */
export function sliceExpr(name: string, start: string, stop: string, step: string): string {
  const s = start.trim()
  const e = stop.trim()
  const k = step.trim()
  return k === '' ? `${name}[${s}:${e}]` : `${name}[${s}:${e}:${k}]`
}
