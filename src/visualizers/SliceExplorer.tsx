import { useRef, useState } from 'react'
import { parseSliceField, sliceExpr, sliceIndices } from './slicing'

interface Seq {
  id: string
  name: string
  items: string[]
  isStr: boolean
}

const SEQS: Seq[] = [
  { id: 'str', name: 's', items: [...'mountain'], isStr: true },
  { id: 'list', name: 'a', items: ['10', '20', '30', '40', '50', '60', '70'], isStr: false },
]

const QUICK: [string, string, string][] = [
  ['2', '5', ''],
  ['', '3', ''],
  ['-3', '', ''],
  ['', '', '2'],
  ['1', '6', '2'],
  ['', '', '-1'],
  ['5', '1', '-2'],
  ['2', '100', ''],
]

const NEED = 5

const show = (seq: Seq, idx: number[]) => (seq.isStr ? `'${idx.map((i) => seq.items[i]).join('')}'` : `[${idx.map((i) => seq.items[i]).join(', ')}]`)

interface Props {
  onFinished: () => void
}

/** Type a start, stop and step and see exactly which cells a slice picks, in which order. */
export default function SliceExplorer({ onFinished }: Props) {
  const [seqId, setSeqId] = useState('str')
  const [start, setStart] = useState('2')
  const [stop, setStop] = useState('5')
  const [step, setStep] = useState('')
  const [tried, setTried] = useState<string[]>([])
  const [usedNegative, setUsedNegative] = useState(false)
  const finished = useRef(false)

  const seq = SEQS.find((s) => s.id === seqId) ?? SEQS[0]
  const a = parseSliceField(start)
  const b = parseSliceField(stop)
  const c = parseSliceField(step)
  const invalid = a === 'invalid' || b === 'invalid' || c === 'invalid'
  const zero = c === 0
  const idx = !invalid && !zero ? sliceIndices(seq.items.length, a as number | null, b as number | null, c as number | null) : []
  const expr = sliceExpr(seq.name, start, stop, step)

  // Record a slice the learner has actually looked at, and finish once they have explored enough.
  const record = (s1: string, s2: string, s3: string, sq: Seq) => {
    const x = parseSliceField(s1), y = parseSliceField(s2), z = parseSliceField(s3)
    if (x === 'invalid' || y === 'invalid' || z === 'invalid' || z === 0) return
    const key = `${sq.id}:${sliceExpr('x', s1, s2, s3)}`
    const nextTried = tried.includes(key) ? tried : [...tried, key]
    const neg = usedNegative || (z !== null && z < 0)
    setTried(nextTried)
    setUsedNegative(neg)
    if (!finished.current && nextTried.length >= NEED && neg) {
      finished.current = true
      onFinished()
    }
  }

  const apply = (s1: string, s2: string, s3: string) => {
    setStart(s1); setStop(s2); setStep(s3)
    record(s1, s2, s3, seq)
  }
  const edit = (field: 'start' | 'stop' | 'step', v: string) => {
    const n = { start, stop, step, [field]: v }
    apply(n.start, n.stop, n.step)
  }

  return (
    <div className="viz slice" data-testid="slice-explorer">
      <div className="tabs" role="tablist" aria-label="Sequence">
        {SEQS.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === seqId} className={`tab${s.id === seqId ? ' on' : ''}`} onClick={() => { setSeqId(s.id); record(start, stop, step, s) }} data-testid={`seq-${s.id}`}>
            {s.isStr ? 'string "mountain"' : 'list [10 … 70]'}
          </button>
        ))}
      </div>

      <div className="slice-cells" role="img" aria-label={`${seq.name} has ${seq.items.length} items. ${expr} picks indices ${idx.join(', ') || 'none'}.`}>
        {seq.items.map((it, i) => {
          const order = idx.indexOf(i)
          return (
            <div key={i} className={`slice-cell${order >= 0 ? ' picked' : ''}`} data-picked={order >= 0 ? order + 1 : undefined} data-testid={`cell-${i}`}>
              <span className="slice-pos">{i}</span>
              <span className="slice-val">{it}</span>
              <span className="slice-neg">{i - seq.items.length}</span>
              <span className="slice-order">{order >= 0 ? order + 1 : ''}</span>
            </div>
          )
        })}
      </div>
      <p className="muted small">Top: positive index. Bottom: negative index. The number under a picked cell is the order it was taken in.</p>

      <div className="slice-inputs">
        <code>{seq.name}[</code>
        <label>start <input value={start} onChange={(e) => edit('start', e.target.value)} inputMode="numeric" data-testid="slice-start" aria-label="start" placeholder="(blank)" /></label>
        <code>:</code>
        <label>stop <input value={stop} onChange={(e) => edit('stop', e.target.value)} inputMode="numeric" data-testid="slice-stop" aria-label="stop" placeholder="(blank)" /></label>
        <code>:</code>
        <label>step <input value={step} onChange={(e) => edit('step', e.target.value)} inputMode="numeric" data-testid="slice-step" aria-label="step" placeholder="(blank)" /></label>
        <code>]</code>
      </div>

      <p className="viz-note" data-testid="slice-result" role="status">
        {invalid ? 'Each box must be blank or a whole number such as 2 or -1.' : zero ? 'ValueError: slice step cannot be zero.' : <><code>{expr}</code> = <code>{show(seq, idx)}</code>{idx.length === 0 && ' (an empty slice is fine, no error)'}</>}
      </p>

      <div className="row wrap">
        <span className="muted small">Try:</span>
        {QUICK.map(([x, y, z], i) => (
          <button key={i} className="ghost" onClick={() => apply(x, y, z)} data-testid={`quick-${i}`}>{sliceExpr(seq.name, x, y, z)}</button>
        ))}
      </div>

      <p className="muted small" data-testid="slice-progress">
        {tried.length >= NEED && usedNegative ? 'Explored! ' : ''}{Math.min(tried.length, NEED)}/{NEED} different slices tried. {usedNegative ? 'Negative step: done.' : 'Include one with a negative step.'}
      </p>
    </div>
  )
}
