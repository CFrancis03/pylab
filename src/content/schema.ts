import { z } from 'zod'

/** Every activity carries a topic tag (for review mode) and an XP reward. */
const base = {
  id: z.string().regex(/^[a-z0-9-]+$/, 'ids are kebab-case'),
  topic: z.string().min(1),
  xp: z.number().int().positive().default(10),
}

export const VISUALIZERS = [
  'name-binding',
  'pass-by-reference',
  'scope-legb',
  'slicing',
  'hash-table',
  'generator-stepper',
  'short-circuit',
  'import-resolution',
  'mro',
  'exception-flow',
] as const

export const MINIGAMES = [
  'regex-hunter',
  'endian-puzzle',
  'set-venn',
  'exception-tree',
  'dunder-matcher',
] as const

export const concept = z.object({
  ...base,
  type: z.literal('concept'),
  title: z.string(),
  /** Light markdown: **bold**, `code`, and "- " bullets. */
  body: z.string(),
  code: z.string().optional(),
})

export const mcq = z.object({
  ...base,
  type: z.literal('mcq'),
  question: z.string(),
  code: z.string().optional(),
  options: z.array(z.string()).min(2).max(6),
  /** Index (or indices, for "select all") of the correct option(s). */
  answer: z.union([z.number().int(), z.array(z.number().int()).min(1)]),
  explanation: z.string(),
})

export const predictOutput = z.object({
  ...base,
  type: z.literal('predict-output'),
  prompt: z.string().default('What does this print?'),
  code: z.string(),
  /** Exact stdout (trailing whitespace ignored). Verified under CPython by validate-content. */
  expected: z.string(),
  explanation: z.string(),
})

export const spotBug = z.object({
  ...base,
  type: z.literal('spot-bug'),
  prompt: z.string().default('Click the line that contains the bug.'),
  code: z.string(),
  /** 1-based line numbers that count as the bug. */
  bugLines: z.array(z.number().int().positive()).min(1),
  explanation: z.string(),
})

export const parsons = z.object({
  ...base,
  type: z.literal('parsons'),
  prompt: z.string(),
  /** Correct order, with indentation preserved in each string. */
  lines: z.array(z.string()).min(2),
  distractors: z.array(z.string()).default([]),
  explanation: z.string(),
})

export const codeChallenge = z.object({
  ...base,
  type: z.literal('code-challenge'),
  title: z.string(),
  prompt: z.string(),
  starter: z.string(),
  /**
   * Python run after the learner's code in the same namespace. Use the injected
   * helpers: `check(name, got, want)` and `check_true(name, cond)`.
   */
  tests: z.string(),
  hints: z.array(z.string()).default([]),
  /** Reference solution, executed against `tests` by validate-content. */
  solution: z.string(),
  /** Virtual files made available to open() inside the sandbox. */
  files: z.record(z.string(), z.string()).default({}),
  timeoutMs: z.number().int().positive().default(5000),
})

export const visualizer = z.object({
  ...base,
  type: z.literal('visualizer'),
  title: z.string(),
  name: z.enum(VISUALIZERS),
  params: z.record(z.string(), z.unknown()).default({}),
})

export const minigame = z.object({
  ...base,
  type: z.literal('minigame'),
  title: z.string(),
  name: z.enum(MINIGAMES),
  params: z.record(z.string(), z.unknown()).default({}),
})

export const flashcards = z.object({
  ...base,
  type: z.literal('flashcards'),
  title: z.string(),
  cards: z
    .array(z.object({ front: z.string(), back: z.string() }))
    .min(1),
})

export const activity = z.discriminatedUnion('type', [
  concept,
  mcq,
  predictOutput,
  spotBug,
  parsons,
  codeChallenge,
  visualizer,
  minigame,
  flashcards,
])

export const lesson = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  /** One-line hook shown on the lesson card. */
  blurb: z.string(),
  activities: z.array(activity).min(1),
})

export const bossBattle = z.object({
  title: z.string(),
  /** Mixed timed quiz: 10 questions is the target. */
  questions: z.array(mcq).min(1),
  challenge: codeChallenge,
  passMark: z.number().min(0).max(1).default(0.7),
})

export const region = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().positive(),
  name: z.string(),
  /** Source lecture numbers, e.g. [13, 14]. */
  lectures: z.array(z.number().int().positive()).min(1),
  blurb: z.string(),
  /** Position on the overworld map in a 1000x600 viewBox. */
  mapPos: z.object({ x: z.number(), y: z.number() }),
  emoji: z.string(),
  lessons: z.array(lesson).min(1),
  boss: bossBattle,
})

/** Map-level facts about a region. Available for all regions before their lessons are authored. */
export const regionMeta = region.omit({ lessons: true, boss: true })

export type RegionMeta = z.infer<typeof regionMeta>
export type Concept = z.infer<typeof concept>
export type Mcq = z.infer<typeof mcq>
export type PredictOutput = z.infer<typeof predictOutput>
export type SpotBug = z.infer<typeof spotBug>
export type Parsons = z.infer<typeof parsons>
export type CodeChallenge = z.infer<typeof codeChallenge>
export type Visualizer = z.infer<typeof visualizer>
export type Minigame = z.infer<typeof minigame>
export type Flashcards = z.infer<typeof flashcards>
export type Activity = z.infer<typeof activity>
export type Lesson = z.infer<typeof lesson>
export type BossBattle = z.infer<typeof bossBattle>
export type Region = z.infer<typeof region>

/** Authoring helper: validates and applies defaults at import time. */
export const defineRegion = (r: z.input<typeof region>): Region => region.parse(r)
