import { useState } from 'react'
import LevelTabs from './LevelTabs'
import { hiddenSlots, TREE_LEVELS, type TreeLevel, type TreeNode } from './exceptionTree'
import { useSolved } from './useSolved'

interface ViewProps {
  level: TreeLevel
  cleared: boolean
  onSolved: () => void
}

function TreeLevelView({ level, cleared, onSolved }: ViewProps) {
  const slots = hiddenSlots(level.root)
  const [filled, setFilled] = useState<string[]>([])
  const [chip, setChip] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [message, setMessage] = useState('Pick an exception from the pool, then click the slot where it belongs.')

  const pool = slots.map((s) => s.name).filter((n) => !filled.includes(n)).sort()

  const place = (slotName: string, clue: string) => {
    if (filled.includes(slotName)) return
    if (!chip) { setMessage('Pick an exception from the pool first.'); return }
    if (chip === slotName) {
      const next = [...filled, slotName]
      setFilled(next)
      setChip(null)
      if (next.length === slots.length) { setMessage('✓ The whole branch is in place!'); onSolved() }
      else setMessage(`✓ ${slotName} fits there.`)
    } else {
      setMistakes((m) => m + 1)
      setMessage(`✗ ${chip} does not match "${clue}".`)
    }
  }

  const render = (n: TreeNode) => {
    const isSlot = !!n.clue
    const done = isSlot && filled.includes(n.name)
    return (
      <li key={n.name}>
        {isSlot && !done ? (
          <button className="tree-slot" onClick={() => place(n.name, n.clue as string)} data-testid={`slot-${n.name}`}>
            <span className="muted small">{n.clue}</span>
          </button>
        ) : (
          <span className={`tree-node${done ? ' placed' : ''}`} data-testid={`node-${n.name}`}>{done ? '✓ ' : ''}{n.name}</span>
        )}
        {n.children && (!isSlot || done) && <ul>{n.children.map(render)}</ul>}
        {n.children && isSlot && !done && <ul className="tree-locked">{n.children.map((c) => <li key={c.name}><span className="tree-node dim">?</span></li>)}</ul>}
      </li>
    )
  }

  return (
    <div data-testid="tree-level" data-solved={cleared ? 'true' : 'false'}>
      <p>Each dashed slot describes an exception. Put the right class in the right place in the hierarchy.</p>
      <ul className="tree" aria-label="Exception hierarchy">{render(level.root)}</ul>
      <div className="chips tree-pool" data-testid="tree-pool" aria-label="Pool of exception classes">
        {pool.length === 0 && <span className="muted small">(pool empty)</span>}
        {pool.map((n) => (
          <button key={n} className={`chip pick${chip === n ? ' active' : ''}`} aria-pressed={chip === n} onClick={() => setChip(chip === n ? null : n)} data-testid={`pool-${n}`}>{n}</button>
        ))}
      </div>
      <p className="viz-note" role="status" data-testid="tree-status">{message}</p>
      <p className="muted small">Mistakes: {mistakes}</p>
    </div>
  )
}

export default function ExceptionTree({ onFinished }: { onFinished: () => void }) {
  const [idx, setIdx] = useState(0)
  const { solved, mark } = useSolved(TREE_LEVELS.map((l) => l.id), onFinished)
  const level = TREE_LEVELS[idx]
  return (
    <div className="viz game" data-testid="game-exception-tree">
      <LevelTabs levels={TREE_LEVELS} active={idx} solved={solved} onPick={setIdx} label="Hierarchy levels" />
      <TreeLevelView key={level.id} level={level} cleared={solved.includes(level.id)} onSolved={() => mark(level.id)} />
    </div>
  )
}
