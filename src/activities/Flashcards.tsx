import { useState } from 'react'
import { Rich } from '../ui/Md'
import type { Flashcards as F } from '../content/schema'
import { rateFlashcard } from '../game/store'

/**
 * Work through every card until each has been marked "Got it" once. "Again" puts a card
 * back at the end of the queue. Ratings feed the long-term Leitner schedule used by review mode.
 */
export default function Flashcards({ a, onFinished }: { a: F; onFinished: () => void }) {
  const [queue, setQueue] = useState<number[]>(() => a.cards.map((_, i) => i))
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const current = queue[0]

  const rate = (gotIt: boolean) => {
    rateFlashcard(`${a.id}#${current}`, gotIt)
    const rest = queue.slice(1)
    const next = gotIt ? rest : [...rest, current]
    if (gotIt) setKnown((k) => k + 1)
    setQueue(next)
    setFlipped(false)
    if (next.length === 0) onFinished()
  }

  if (current === undefined) {
    return <p className="muted" data-testid="cards-done">All {a.cards.length} cards learned. They will resurface in review mode.</p>
  }

  return (
    <div>
      <p className="muted small" data-testid="cards-count">{known}/{a.cards.length} learned · {queue.length} left</p>
      <button className={`flashcard${flipped ? ' flipped' : ''}`} onClick={() => setFlipped((f) => !f)} data-testid="card">
        <span className="side">{flipped ? 'Answer' : 'Question'}</span>
        <span className="face" data-testid="card-face"><Rich text={flipped ? a.cards[current].back : a.cards[current].front} /></span>
        <span className="sr-only"> (press to {flipped ? 'see the question' : 'reveal the answer'})</span>
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
  )
}
