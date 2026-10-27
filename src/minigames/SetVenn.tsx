import { useState } from 'react'
import LevelTabs from './LevelTabs'
import { itemsOf, regionItems, sameRegions, VENN_LEVELS, type Region, type VennLevel } from './venn'
import { useSolved } from './useSolved'

const R = 80
const LENS = 'M150,30.72 A80,80 0 0 0 150,169.28 A80,80 0 0 0 150,30.72 Z'
const circle = (cx: number) => `M${cx - R},100 a${R},${R} 0 1,0 ${2 * R},0 a${R},${R} 0 1,0 ${-2 * R},0 Z`
const PATH: Record<Region, string> = { onlyA: `${circle(110)} ${LENS}`, both: LENS, onlyB: `${circle(190)} ${LENS}` }
const LABEL_X: Record<Region, number> = { onlyA: 78, both: 150, onlyB: 222 }
const NAME: Record<Region, string> = { onlyA: 'only in A', both: 'in both', onlyB: 'only in B' }

const setText = (items: number[]) => `{${items.join(', ')}}`

function VennLevelView({ level, cleared, onSolved }: { level: VennLevel; cleared: boolean; onSolved: () => void }) {
  const [picked, setPicked] = useState<Region[]>([])
  const [verdict, setVerdict] = useState<'none' | 'right' | 'wrong'>('none')
  const items = regionItems(level)
  const shaded = level.mode === 'name' ? level.answer : picked
  const interactive = level.mode === 'shade' && verdict !== 'right'

  const toggle = (r: Region) => {
    if (!interactive) return
    setVerdict('none')
    setPicked((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]))
  }
  const check = () => {
    if (sameRegions(picked, level.answer)) { setVerdict('right'); onSolved() } else setVerdict('wrong')
  }
  const choose = (o: string) => {
    if (o === level.expr) { setVerdict('right'); onSolved() } else setVerdict('wrong')
  }

  return (
    <div data-testid="venn-level" data-solved={cleared ? 'true' : 'false'}>
      <p>
        <code>A = {setText(level.A)}</code> &nbsp; <code>B = {setText(level.B)}</code>
      </p>
      {level.mode === 'shade' ? (
        <p>Shade the part of the diagram that <code data-testid="venn-expr">{level.expr}</code> selects, then press Check.</p>
      ) : (
        <p>Which expression selects the shaded part?</p>
      )}
      <svg className="venn" viewBox="0 0 300 200" role="group" aria-label="Venn diagram of A and B">
        {(['onlyA', 'both', 'onlyB'] as Region[]).map((r) => (
          <path
            key={r} d={PATH[r]} fillRule="evenodd"
            className={`venn-region${shaded.includes(r) ? ' on' : ''}${interactive ? ' live' : ''}`}
            role={interactive ? 'button' : undefined} aria-pressed={interactive ? picked.includes(r) : undefined}
            aria-label={`${NAME[r]}: ${items[r].join(', ') || 'nothing'}`}
            tabIndex={interactive ? 0 : -1} data-testid={`region-${r}`}
            onClick={() => toggle(r)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(r) } }}
          />
        ))}
        <circle cx="110" cy="100" r={R} className="venn-ring" />
        <circle cx="190" cy="100" r={R} className="venn-ring" />
        <text x="62" y="22" className="venn-name">A</text>
        <text x="238" y="22" className="venn-name">B</text>
        {(['onlyA', 'both', 'onlyB'] as Region[]).map((r) => (
          <text key={r} x={LABEL_X[r]} y="105" textAnchor="middle" className="venn-items">{items[r].join(' ')}</text>
        ))}
      </svg>
      {level.mode === 'shade' ? (
        <div className="row">
          <button onClick={check} disabled={verdict === 'right'} data-testid="venn-check">Check</button>
          <button className="ghost" onClick={() => { setPicked([]); setVerdict('none') }} disabled={verdict === 'right'} data-testid="venn-clear">Clear</button>
        </div>
      ) : (
        <div className="row wrap">
          {level.options?.map((o) => <button key={o} className="ghost" onClick={() => choose(o)} disabled={verdict === 'right'} data-testid={`venn-opt-${o}`}>{o}</button>)}
        </div>
      )}
      <p className="viz-note" role="status" data-testid="venn-status">
        {verdict === 'right' ? <>✓ <code>{level.expr}</code> = <code>{setText(itemsOf(level, level.answer))}</code>. {level.note}</>
          : verdict === 'wrong' ? (level.mode === 'shade' ? `Not yet: you shaded ${setText(itemsOf(level, picked))}. Think about which regions the operator keeps.` : 'Not that one. Compare each operator with the shaded part.')
          : level.mode === 'shade' ? 'Click regions to shade them.' : 'Pick an expression.'}
      </p>
    </div>
  )
}

export default function SetVenn({ onFinished }: { onFinished: () => void }) {
  const [idx, setIdx] = useState(0)
  const { solved, mark } = useSolved(VENN_LEVELS.map((l) => l.id), onFinished)
  const level = VENN_LEVELS[idx]
  const titled = VENN_LEVELS.map((l, i) => ({ id: l.id, title: l.mode === 'shade' ? 'Shade' : 'Name it', n: i }))
  return (
    <div className="viz game" data-testid="game-set-venn">
      <LevelTabs levels={titled} active={idx} solved={solved} onPick={setIdx} label="Venn levels" />
      <VennLevelView key={level.id} level={level} cleared={solved.includes(level.id)} onSolved={() => mark(level.id)} />
    </div>
  )
}
