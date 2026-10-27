import type { Progress } from './progress'
import { levelForXp } from './xp'

/** Content facts badges need, kept separate so this module never imports the content registry. */
export interface BadgeCtx {
  /** lessonId -> ids of the activities in it. */
  lessons: Record<string, string[]>
}

export interface Badge {
  id: string
  name: string
  emoji: string
  desc: string
  earned: (p: Progress, ctx: BadgeCtx) => boolean
}

export const BADGES: Badge[] = [
  {
    id: 'first-steps', name: 'First Steps', emoji: '🥚', desc: 'Complete your first activity.',
    earned: (p) => Object.keys(p.completed).length >= 1,
  },
  {
    id: 'lesson-learner', name: 'Lesson Learner', emoji: '📘', desc: 'Finish every activity in a lesson.',
    earned: (p, ctx) =>
      Object.values(ctx.lessons).some((ids) => ids.length > 0 && ids.every((id) => id in p.completed)),
  },
  {
    id: 'on-a-roll', name: 'On a Roll', emoji: '🔥', desc: 'Study 3 days in a row.',
    earned: (p) => p.streak.best >= 3,
  },
  {
    id: 'week-warrior', name: 'Week Warrior', emoji: '🗓️', desc: 'Study 7 days in a row.',
    earned: (p) => p.streak.best >= 7,
  },
  {
    id: 'level-5', name: 'Viper', emoji: '🐍', desc: 'Reach level 5.',
    earned: (p) => levelForXp(p.xp) >= 5,
  },
  {
    id: 'boss-slayer', name: 'Boss Slayer', emoji: '⚔️', desc: 'Defeat your first boss.',
    earned: (p) => Object.values(p.bosses).some((b) => b.passed),
  },
  {
    id: 'reviewer', name: 'Reviewer', emoji: '📝', desc: 'Answer 25 questions in review mode or mock exams.',
    earned: (p) => p.practice >= 25,
  },
  {
    id: 'exam-ready', name: 'Exam Ready', emoji: '🎓', desc: 'Score 80% or more on a mock exam of 10+ questions.',
    earned: (p) => p.exams.some((e) => e.total >= 10 && e.correct / e.total >= 0.8),
  },
  {
    id: 'card-sharp', name: 'Card Sharp', emoji: '🃏', desc: 'Get 30 flashcards past their first review.',
    earned: (p) => Object.values(p.cards).filter((c) => c.box >= 1).length >= 30,
  },
]

/** Ids of badges that `p` qualifies for and does not hold yet. */
export function badgesEarnedBy(p: Progress, ctx: BadgeCtx): string[] {
  return BADGES.filter((b) => !(b.id in p.badges) && b.earned(p, ctx)).map((b) => b.id)
}
