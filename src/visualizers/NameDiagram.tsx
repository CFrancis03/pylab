import { describeFrame, GEOM, layoutFrame } from './layout'
import type { Frame } from './types'

/** Scopes on the left, objects on the right, arrows for "this name refers to that object". */
export default function NameDiagram({ frame }: { frame: Frame }) {
  const l = layoutFrame(frame)
  return (
    <svg className="diagram" viewBox={`0 0 ${l.width} ${l.height}`} role="img" aria-label={describeFrame(frame)} data-testid="diagram">
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
        </marker>
      </defs>
      {l.scopes.map((s) => (
        <g key={s.name} className={`d-scope${s.active ? ' active' : ''}`} data-testid={`scope-${s.name}`}>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={10} />
          <text className="d-scope-title" x={s.x + 12} y={s.y + 19}>{s.name} scope</text>
          {s.vars.length === 0 && <text className="d-empty" x={s.x + 12} y={s.y + GEOM.header + 22}>(empty)</text>}
          {s.vars.map((v) => (
            <g key={v.name} className={v.declared ? 'd-var declared' : 'd-var'}>
              <rect x={s.x + 10} y={v.y - 14} width={s.w - 20} height={28} rx={6} />
              <text x={s.x + 20} y={v.y + 5}>{v.name}{v.declared && v.note ? `  (${v.note})` : ''}</text>
            </g>
          ))}
        </g>
      ))}
      {l.objects.map((o) => (
        <g key={o.id} className={`d-obj${o.state ? ` ${o.state}` : ''}`} data-testid={`obj-${o.id}`}>
          <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={8} />
          <text className="d-type" x={o.x + 10} y={o.y + 14}>{o.type}</text>
          <text x={o.x + 10} y={o.y + 29}>{o.label}</text>
        </g>
      ))}
      {l.arrows.map((a) => {
        const mid = (a.from.x + a.to.x) / 2
        return (
          <path
            key={a.key} className={`d-arrow${a.toDim ? ' dim' : ''}`} markerEnd="url(#arrowhead)"
            d={`M ${a.from.x} ${a.from.y} C ${mid} ${a.from.y}, ${mid} ${a.to.y}, ${a.to.x - 2} ${a.to.y}`}
            data-testid={`arrow-${a.key}`}
          />
        )
      })}
    </svg>
  )
}
