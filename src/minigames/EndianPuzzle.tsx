import { useState } from 'react'
import LevelTabs from './LevelTabs'
import { CODES, ENDIAN_LEVELS, formatString, parseHex, sizeOf, unpack, type Code, type EndianLevel, type Order } from './structLab'
import { useSolved } from './useSolved'

const show = (values: string[]) => (values.length === 1 ? `(${values[0]},)` : `(${values.join(', ')})`)

function EndianLevelView({ level, cleared, onSolved }: { level: EndianLevel; cleared: boolean; onSolved: () => void }) {
  const [order, setOrder] = useState<Order>('<')
  const [fields, setFields] = useState<Code[]>(['B'])
  const data = parseHex(level.bytes)
  const result = unpack(order, fields, data)
  const win = result.ok && JSON.stringify(result.values) === JSON.stringify(level.target)

  const update = (o: Order, f: Code[]) => {
    setOrder(o)
    setFields(f)
    const r = unpack(o, f, data)
    if (r.ok && JSON.stringify(r.values) === JSON.stringify(level.target)) onSolved()
  }

  // Which field each byte belongs to, so the byte boxes can be coloured to match the fields.
  const owner: number[] = []
  fields.forEach((f, i) => { for (let k = 0; k < sizeOf(f); k++) owner.push(i) })

  return (
    <div data-testid="endian-level" data-solved={cleared ? 'true' : 'false'}>
      <p>{level.story}</p>
      <div className="bytes" role="img" aria-label={`Bytes: ${level.bytes}`}>
        {data.map((b, i) => (
          <span key={i} className={`byte f${(owner[i] ?? -1) % 4}${owner[i] === undefined ? ' none' : ''}`}>{b.toString(16).padStart(2, '0')}</span>
        ))}
      </div>
      <div className="row wrap">
        <span className="muted small">Byte order:</span>
        <button className={`tab${order === '<' ? ' on' : ''}`} aria-pressed={order === '<'} onClick={() => update('<', fields)} data-testid="order-le">&lt; little-endian</button>
        <button className={`tab${order === '>' ? ' on' : ''}`} aria-pressed={order === '>'} onClick={() => update('>', fields)} data-testid="order-be">&gt; big-endian</button>
      </div>
      <div className="row wrap fields">
        {fields.map((f, i) => (
          <span key={i} className={`field f${i % 4}`}>
            <select value={f} aria-label={`Field ${i + 1} type`} data-testid={`field-${i}`} onChange={(e) => update(order, fields.map((x, k) => (k === i ? (e.target.value as Code) : x)))}>
              {CODES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.size}B {c.signed ? 'signed' : 'unsigned'}</option>)}
            </select>
            {fields.length > 1 && <button className="ghost" aria-label={`Remove field ${i + 1}`} onClick={() => update(order, fields.filter((_, k) => k !== i))}>✕</button>}
          </span>
        ))}
        {fields.length < 6 && <button className="ghost" onClick={() => update(order, [...fields, 'B'])} data-testid="add-field">+ field</button>}
      </div>
      <pre className="out-pre" data-testid="struct-call">{`struct.unpack('${formatString(order, fields)}', data)`}</pre>
      <p className="viz-note" role="status" data-testid="struct-result">
        {result.ok ? <>→ <code>{show(result.values)}</code> {win ? '✓ That is the target!' : <span className="muted">Target: <code>{show(level.target)}</code></span>}</> : <span className="err-text">struct.error: {result.error}</span>}
      </p>
      <details>
        <summary>Stuck? Hint</summary>
        <p>{level.hint}</p>
      </details>
    </div>
  )
}

export default function EndianPuzzle({ onFinished }: { onFinished: () => void }) {
  const [idx, setIdx] = useState(0)
  const { solved, mark } = useSolved(ENDIAN_LEVELS.map((l) => l.id), onFinished)
  const level = ENDIAN_LEVELS[idx]
  return (
    <div className="viz game" data-testid="game-endian-puzzle">
      <LevelTabs levels={ENDIAN_LEVELS} active={idx} solved={solved} onPick={setIdx} label="Endian levels" />
      <EndianLevelView key={level.id} level={level} cleared={solved.includes(level.id)} onSolved={() => mark(level.id)} />
    </div>
  )
}
