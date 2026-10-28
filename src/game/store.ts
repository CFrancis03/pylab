import { useSyncExternalStore } from 'react'
import { regions } from '../content'
import { BADGES, type BadgeCtx } from './badges'
import {
  emptyProgress, parseProgress, recordActivity, recordBoss, recordExam, recordPractice,
  type ActivityResult, type ExamResult, type GameEvent, type Progress, type Settings,
} from './progress'
import { celebrate } from '../ui/confetti'
import { playSound } from './sound'
import { rateCard } from './srs'
import { dayKey } from './streak'
import { pushToast } from './toasts'
import { levelTitle } from './xp'

const KEY = 'pythonlab:save:v1'

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return parseProgress(raw)
  } catch {
    // Corrupt or inaccessible storage (private mode, quota): start fresh rather than crash.
  }
  return emptyProgress()
}

let state: Progress = load()
const listeners = new Set<() => void>()

function commit(next: Progress) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Progress still works in memory; it just will not survive a reload.
  }
  listeners.forEach((l) => l())
}

export const getProgress = (): Progress => state

export const useProgress = (): Progress =>
  useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), getProgress)

/** Facts about authored content that badge rules need. */
function badgeCtx(): BadgeCtx {
  const lessons: BadgeCtx['lessons'] = {}
  for (const r of regions) for (const l of r.lessons) lessons[`${r.id}/${l.id}`] = l.activities.map((a) => a.id)
  return { lessons }
}

function announce(events: GameEvent[]) {
  for (const e of events) {
    if (e.kind === 'xp') pushToast('xp', `+${e.amount} XP`)
    else if (e.kind === 'level') {
      pushToast('level', `Level up! You are now a ${levelTitle(e.level)} (Lv ${e.level})`, 5000)
      playSound('level', state.settings.sound)
      celebrate()
    }
    else if (e.kind === 'badge') {
      const b = BADGES.find((x) => x.id === e.id)
      if (b) {
        pushToast('badge', `${b.emoji} Badge earned: ${b.name}`, 5000)
        playSound('badge', state.settings.sound)
      }
    } else if (e.kind === 'streak' && e.count > 1) pushToast('streak', `🔥 ${e.count}-day streak!`)
  }
}

export function completeActivity(a: ActivityResult) {
  playSound(a.correct ? 'correct' : 'wrong', state.settings.sound)
  const out = recordActivity(state, a, badgeCtx(), new Date())
  commit(out.progress)
  announce(out.events)
}

export function finishBoss(regionId: string, score: number, passMark: number, bossXp = 100) {
  if (score >= passMark) {
    playSound('win', state.settings.sound)
    celebrate()
  }
  const out = recordBoss(state, regionId, score, passMark, bossXp, badgeCtx(), new Date())
  commit(out.progress)
  announce(out.events)
}

/** A review or mock-exam answer: counts toward topic stats and the streak, but pays no XP. */
export function practiceAnswer(a: Pick<ActivityResult, 'id' | 'topic' | 'correct'>) {
  playSound(a.correct ? 'correct' : 'wrong', state.settings.sound)
  const out = recordPractice(state, a, badgeCtx(), new Date())
  commit(out.progress)
  announce(out.events)
}

export function finishExam(e: ExamResult) {
  const out = recordExam(state, e, badgeCtx(), new Date())
  commit(out.progress)
  announce(out.events)
}

export function updateSettings(patch: Partial<Settings>) {
  commit({ ...state, settings: { ...state.settings, ...patch } })
}

export const exportSave = (): string => JSON.stringify(state, null, 2)

/** Replace progress with an imported save. Throws a user-readable Error if the text is not a valid save. */
export function importSave(text: string) {
  commit(parseProgress(text))
}

export function resetProgress() {
  commit({ ...emptyProgress(), settings: state.settings })
}

/** Schedule a flashcard after the learner rates it. `key` is `activityId#cardIndex`. */
export function rateFlashcard(key: string, known: boolean) {
  commit({ ...state, cards: { ...state.cards, [key]: rateCard(state.cards[key], known, dayKey(new Date())) } })
}
