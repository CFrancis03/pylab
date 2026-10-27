import { describe, expect, it } from 'vitest'
import { matchRoute } from './router'

describe('matchRoute', () => {
  it('matches every page', () => {
    expect(matchRoute('/')).toEqual({ name: 'map' })
    expect(matchRoute('')).toEqual({ name: 'map' })
    expect(matchRoute('/region/snake-nest')).toEqual({ name: 'region', id: 'snake-nest' })
    expect(matchRoute('/region/snake-nest/lesson/why-python')).toEqual({ name: 'lesson', id: 'snake-nest', lessonId: 'why-python' })
    expect(matchRoute('/region/snake-nest/boss')).toEqual({ name: 'boss', id: 'snake-nest' })
    expect(matchRoute('/profile')).toEqual({ name: 'profile' })
    expect(matchRoute('/settings')).toEqual({ name: 'settings' })
    expect(matchRoute('/dev/engine')).toEqual({ name: 'dev-engine' })
  })
  it('tolerates a trailing slash and rejects everything else', () => {
    expect(matchRoute('/settings/')).toEqual({ name: 'settings' })
    expect(matchRoute('/region')).toEqual({ name: 'not-found' })
    expect(matchRoute('/region/a/lesson')).toEqual({ name: 'not-found' })
    expect(matchRoute('/region/a/b/c/d')).toEqual({ name: 'not-found' })
  })
})
