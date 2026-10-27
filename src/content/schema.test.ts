import { describe, expect, it } from 'vitest'
import { defineRegion, activity } from './schema'

const challenge = {
  id: 'double-it',
  type: 'code-challenge' as const,
  topic: 'functions',
  title: 'Double it',
  prompt: 'Write double(x).',
  starter: 'def double(x):\n    pass',
  tests: "check('double(2)', double(2), 4)",
  solution: 'def double(x):\n    return x * 2',
}

describe('content schema', () => {
  it('applies defaults to activities', () => {
    const a = activity.parse(challenge)
    expect(a.xp).toBe(10)
    expect(a.type === 'code-challenge' && a.hints).toEqual([])
  })

  it('rejects non-kebab-case ids', () => {
    expect(() => activity.parse({ ...challenge, id: 'Bad_Id' })).toThrow()
  })

  it('rejects unknown visualizers', () => {
    expect(() =>
      activity.parse({ id: 'v', type: 'visualizer', topic: 't', title: 'x', name: 'nope' }),
    ).toThrow()
  })

  it('builds a full region', () => {
    const r = defineRegion({
      id: 'test-region',
      order: 1,
      name: 'Test',
      lectures: [1],
      blurb: 'b',
      emoji: '🐍',
      mapPos: { x: 10, y: 10 },
      lessons: [{ id: 'l1', title: 'L1', blurb: 'b', activities: [challenge] }],
      boss: {
        title: 'Boss',
        questions: [
          { id: 'q1', type: 'mcq', topic: 't', question: 'q?', options: ['a', 'b'], answer: 0, explanation: 'e' },
        ],
        challenge,
      },
    })
    expect(r.boss.passMark).toBe(0.7)
  })
})
