import { useEffect, useReducer, useRef, useState } from 'react'
import Feedback from '../activities/Feedback'
import { bossScore } from '../activities/logic'
import Mcq from '../activities/Mcq'
import CodeChallenge from '../activities/CodeChallenge'
import { getRegion, playableMetas, regionMetas } from '../content'
import { isUnlocked } from '../game/regions'
import { completeActivity, finishBoss, useProgress } from '../game/store'
import { href } from '../router'
import NotFound from './NotFound'

type Phase = { name: 'quiz'; index: number } | { name: 'challenge' } | { name: 'result' }
interface State {
  phase: Phase
  correct: number
  challengePassed: boolean
}
type Action = { type: 'answered'; ok: boolean } | { type: 'next' } | { type: 'challenge-result'; ok: boolean } | { type: 'finish' }

export const BOSS_XP = 100

function reducer(total: number) {
  return (s: State, a: Action): State => {
    switch (a.type) {
      case 'answered':
        return { ...s, correct: s.correct + (a.ok ? 1 : 0) }
      case 'next':
        if (s.phase.name !== 'quiz') return s
        return { ...s, phase: s.phase.index + 1 < total ? { name: 'quiz', index: s.phase.index + 1 } : { name: 'challenge' } }
      case 'challenge-result':
        return a.ok ? { ...s, challengePassed: true } : s
      case 'finish':
        return { ...s, phase: { name: 'result' } }
    }
  }
}

function useElapsed(running: boolean) {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])
  return sec
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function BossPage({ id }: { id: string }) {
  const p = useProgress()
  const region = getRegion(id)
  const index = regionMetas.findIndex((m) => m.id === id)
  if (!region || index < 0) return <NotFound />
  if (!isUnlocked(p, playableMetas, index, p.settings.freeRoam)) {
    return (
      <main className="page narrow">
        <a className="back" href={href(`/region/${id}`)}>← {region.name}</a>
        <div className="card note-card"><strong>🔒 This boss is still locked.</strong></div>
      </main>
    )
  }
  return <Attempts regionId={id} />
}

/** A local counter remounts the battle for "Try again" without depending on saved progress. */
function Attempts({ regionId }: { regionId: string }) {
  const [attempt, setAttempt] = useState(0)
  return <Battle key={attempt} regionId={regionId} onRetry={() => setAttempt((n) => n + 1)} />
}

function Battle({ regionId, onRetry }: { regionId: string; onRetry: () => void }) {
  const region = getRegion(regionId)!
  const { boss } = region
  const total = boss.questions.length + 1
  const [s, dispatch] = useReducer(reducer(boss.questions.length), { phase: { name: 'quiz', index: 0 }, correct: 0, challengePassed: false } as State)
  const [answered, setAnswered] = useState(false)
  const [challengeTries, setChallengeTries] = useState(0)
  const reported = useRef(false)
  const secs = useElapsed(s.phase.name !== 'result')

  const score = bossScore(s.correct + (s.challengePassed ? 1 : 0), total)
  const won = score >= boss.passMark

  useEffect(() => {
    if (s.phase.name === 'result' && !reported.current) {
      reported.current = true
      finishBoss(regionId, score, boss.passMark, BOSS_XP)
    }
  }, [s.phase.name, regionId, score, boss.passMark])

  const header = (
    <header className="boss-head">
      <a className="back" href={href(`/region/${regionId}`)}>← {region.name}</a>
      <h1>⚔️ {boss.title}</h1>
      <p className="muted small" data-testid="boss-clock">
        {s.phase.name === 'quiz' && `Question ${s.phase.index + 1} of ${boss.questions.length}`}
        {s.phase.name === 'challenge' && 'Final challenge'}
        {s.phase.name === 'result' && 'Battle over'} · ⏱ {clock(secs)} · pass mark {Math.round(boss.passMark * 100)}%
      </p>
    </header>
  )

  if (s.phase.name === 'result') {
    return (
      <main className="page narrow">
        {header}
        <div className={`card ${won ? 'win' : 'note-card'}`} data-testid="boss-result">
          <h2>{won ? '🎉 Boss defeated!' : '💥 The boss survives…'}</h2>
          <p>
            Score: <strong data-testid="boss-score">{Math.round(score * 100)}%</strong>{' '}
            ({s.correct}/{boss.questions.length} questions{s.challengePassed ? ' + challenge' : ', challenge missed'}).
            {won ? ` +${BOSS_XP} XP the first time you win.` : ' Review the lessons and try again.'}
          </p>
          <div className="row">
            <a className="btn" href={href(`/region/${regionId}`)}>Back to {region.name}</a>
            <button className={won ? 'ghost' : ''} onClick={onRetry} data-testid="retry">{won ? 'Fight again' : 'Try again'}</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="page narrow">
      {header}
      {s.phase.name === 'quiz' && (() => {
        const q = boss.questions[s.phase.index]
        const last = s.phase.index + 1 >= boss.questions.length
        return (
          <section className="card activity" key={q.id} data-testid="boss-question">
            <Mcq q={q} retry={false} onResult={(ok) => {
              dispatch({ type: 'answered', ok })
              completeActivity({ id: `boss-${regionId}-${q.id}`, topic: q.topic, xp: 0, correct: ok })
              setAnswered(true)
            }} />
            {answered && (
              <button onClick={() => { setAnswered(false); dispatch({ type: 'next' }) }} data-testid="next">
                {last ? 'On to the final challenge →' : 'Next question →'}
              </button>
            )}
          </section>
        )
      })()}
      {s.phase.name === 'challenge' && (
        <section className="card activity" data-testid="boss-challenge">
          <h3>{boss.challenge.title}</h3>
          <CodeChallenge a={boss.challenge} allowHints={false} lockOnPass onSubmit={(ok) => {
            setChallengeTries((n) => n + 1)
            if (ok) dispatch({ type: 'challenge-result', ok })
          }} />
          <div className="row">
            <button onClick={() => dispatch({ type: 'finish' })} className={s.challengePassed ? '' : 'ghost'} data-testid="finish">
              {s.challengePassed ? 'Finish the battle →' : challengeTries > 0 ? 'Give up and finish' : 'Skip the challenge'}
            </button>
          </div>
          {!s.challengePassed && <Feedback kind="info">Skipping counts the challenge as missed.</Feedback>}
        </section>
      )}
    </main>
  )
}
