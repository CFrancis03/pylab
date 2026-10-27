interface Props {
  levels: { id: string; title: string }[]
  active: number
  solved: string[]
  onPick: (i: number) => void
  label: string
}

export default function LevelTabs({ levels, active, solved, onPick, label }: Props) {
  return (
    <>
      <div className="tabs" role="tablist" aria-label={label}>
        {levels.map((l, i) => (
          <button key={l.id} role="tab" aria-selected={i === active} className={`tab${i === active ? ' on' : ''}`} onClick={() => onPick(i)} data-testid={`level-${i}`}>
            {solved.includes(l.id) ? '✓ ' : ''}{i + 1}. {l.title}
          </button>
        ))}
      </div>
      <p className="muted small" data-testid="game-progress">{solved.length}/{levels.length} levels cleared</p>
    </>
  )
}
