import { describe, expect, it } from 'vitest'
import { playSound } from './sound'

describe('playSound', () => {
  it('does nothing, and does not throw, when sound is off or there is no audio support', () => {
    expect(() => playSound('correct', false)).not.toThrow()
    expect(() => playSound('win', true)).not.toThrow()
  })
})
