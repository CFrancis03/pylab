import type { Frame } from './types'

export const GEOM = {
  width: 580,
  scopeX: 10,
  scopeW: 230,
  objX: 350,
  objW: 220,
  header: 28,
  row: 34,
  pad: 8,
  gap: 14,
  objH: 36,
  objGap: 14,
  top: 10,
} as const

export interface ScopeBox {
  name: string
  active: boolean
  x: number
  y: number
  w: number
  h: number
  vars: { name: string; y: number; declared: boolean; note?: string }[]
}
export interface ObjBox {
  id: string
  label: string
  type: string
  state?: 'dim' | 'changed'
  x: number
  y: number
  w: number
  h: number
}
export interface Arrow {
  key: string
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** Target object is dim: the name still points at it, but it is on its way out. */
  toDim: boolean
}
export interface Layout {
  width: number
  height: number
  scopes: ScopeBox[]
  objects: ObjBox[]
  arrows: Arrow[]
}

/** Names pointing at objects that are not in the frame. Authoring errors, caught by validate-content. */
export function danglingRefs(frame: Frame): string[] {
  const ids = new Set(frame.objects.map((o) => o.id))
  return frame.scopes.flatMap((s) =>
    s.vars.filter((v) => v.to !== undefined && !ids.has(v.to)).map((v) => `${s.name}.${v.name} -> ${v.to}`),
  )
}

/** Deterministic coordinates for one frame. Pure, so it can be unit-tested without a DOM. */
export function layoutFrame(frame: Frame): Layout {
  const G = GEOM
  let y = G.top
  const scopes: ScopeBox[] = frame.scopes.map((s) => {
    const rows = Math.max(1, s.vars.length)
    const h = G.header + rows * G.row + G.pad
    const box: ScopeBox = {
      name: s.name,
      active: !!s.active,
      x: G.scopeX,
      y,
      w: G.scopeW,
      h,
      vars: s.vars.map((v, i) => ({
        name: v.name,
        y: y + G.header + i * G.row + G.row / 2,
        declared: v.kind === 'declared',
        note: v.note,
      })),
    }
    y += h + G.gap
    return box
  })

  let oy = G.top
  const objects: ObjBox[] = frame.objects.map((o) => {
    const box: ObjBox = { ...o, x: G.objX, y: oy, w: G.objW, h: G.objH }
    oy += G.objH + G.objGap
    return box
  })

  const byId = new Map(objects.map((o) => [o.id, o]))
  const arrows: Arrow[] = []
  frame.scopes.forEach((s, si) => {
    s.vars.forEach((v, vi) => {
      const target = v.to === undefined ? undefined : byId.get(v.to)
      if (!target) return
      arrows.push({
        key: `${s.name}.${v.name}`,
        from: { x: G.scopeX + G.scopeW, y: scopes[si].vars[vi].y },
        to: { x: target.x, y: target.y + target.h / 2 },
        toDim: target.state === 'dim',
      })
    })
  })

  return { width: G.width, height: Math.max(y, oy, 120), scopes, objects, arrows }
}

/** Plain-language description of a frame for screen readers. */
export function describeFrame(frame: Frame): string {
  const label = new Map(frame.objects.map((o) => [o.id, `${o.type} ${o.label}`.trim()]))
  const parts = frame.scopes.map((s) => {
    if (s.vars.length === 0) return `${s.name} scope is empty.`
    const items = s.vars.map((v) => (v.kind === 'declared' ? `${v.name} is declared as belonging to another scope` : `${v.name} points to ${label.get(v.to ?? '') ?? 'nothing'}`))
    return `${s.name} scope: ${items.join('; ')}.`
  })
  const garbage = frame.objects.filter((o) => o.state === 'dim').map((o) => `${o.type} ${o.label}`)
  if (garbage.length) parts.push(`No names refer to ${garbage.join(', ')} any more.`)
  return parts.join(' ')
}
