import { useState } from 'react'
import { Rich } from '../ui/Md'
import { rateFlashcard, useProgress } from '../game/store'
import { INTERVALS } from '../game/srs'
import { href } from '../router'
import { useToday } from '../ui/useToday'
import { DECK } from '../study/data'
import { boxCounts, planSession, type DeckCard } from '../study/deck'

export default function CardsPage() {
  const p = useProgress()
  const today = useToday()
  // The day's deck is fixed when the page opens, so rating cards does not reshuffle it mid-session.
  const [plan] = useState(() => planSession(DECK, p.cards, today))
  const [queue, setQueue] = useState<DeckCard[]>(plan.cards)
  const [flipped, setFlipped] = useState(false)
  const [again, setAgain] = useState(0)
  const [known, setKnown] = useState(0)
  const card = queue[0]
  const boxes = boxCounts(DECK, p.cards, INTERVALS.length)

  const rate = (gotIt: boolean) => {
    rateFlashcard(card.key, gotIt)
    setQueue(gotIt ? queue.slice(1) : [...queue.slice(1), card])
    if (gotIt) setKnown((k) => k + 1)
    else setAgain((a) => a + 1)
    setFlipped(false)
  }

  return (
    <main className="page narrow">
      <a className="back" href={href('/study')}>← Study</a>
      <h1>Daily flashcards</h1>
      <p className="muted" data-testid="cards-plan">
        {plan.cards.length === 0
          ? 'Nothing is due today. New cards appear a few at a time, and learned cards come back on a schedule (1, 3, 7, 14, then 30 days).'
          : `Today: ${Math.min(plan.dueTotal, plan.cards.length)} to review and ${plan.cards.length - Math.min(plan.dueTotal, plan.cards.length)} new.`}
      </p>

      {card ? (
        <div>
          <p className="muted small" data-testid="cards-count">{known}/{plan.cards.length} learned · {queue.length} left · {card.regionName}</p>
          <button className={`flashcard${flipped ? ' flipped' : ''}`} onClick={() => setFlipped((f) => !f)} data-testid="card" aria-label={flipped ? 'Answer. Click to see the question' : 'Question. Click to reveal the answer'}>
            <span className="side">{flipped ? 'Answer' : 'Question'}</span>
            <span className="face" data-testid="card-face"><Rich text={flipped ? card.back : card.front} /></span>
          </button>
          {flipped ? (
            <div className="row">
              <button className="danger" onClick={() => rate(false)} data-testid="again">Again</button>
              <button onClick={() => rate(true)} data-testid="gotit">Got it</button>
            </div>
          ) : (
            <p className="muted small">Think of the answer, then flip the card.</p>
          )}
        </div>
      ) : (
        plan.cards.length > 0 && (
          <div className="card win" data-testid="cards-done">
            <h2>Deck complete!</h2>
            <p>{known} card{known === 1 ? '' : 's'} learned{again > 0 ? `, with ${again} “Again” along the way` : ''}. Come back tomorrow for the next ones.</p>
          </div>
        )
      )}

      <h2>Your deck</h2>
      <ul className="boxes" data-testid="boxes">
        {boxes.map((n, i) => (
          <li key={i}>
            <span className="muted small">{i === 0 ? 'New / forgotten' : `Box ${i} · every ${INTERVALS[i]}d`}</span>
            <span className="bar" role="img" aria-label={`${n} cards`}><span style={{ width: `${(n / DECK.length) * 100}%` }} /></span>
            <span className="small">{n}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
