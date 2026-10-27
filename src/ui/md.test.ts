import { describe, expect, it } from 'vitest'
import { parseInline, parseMd } from './md'

describe('markdown subset', () => {
  it('parses inline styles', () => {
    expect(parseInline('a **b** `c` *d* e')).toEqual([
      { t: 'text', s: 'a ' }, { t: 'b', s: 'b' }, { t: 'text', s: ' ' }, { t: 'code', s: 'c' },
      { t: 'text', s: ' ' }, { t: 'i', s: 'd' }, { t: 'text', s: ' e' },
    ])
  })
  it('does not treat a lone asterisk or markup inside code as styling', () => {
    expect(parseInline('2 * 3')).toEqual([{ t: 'text', s: '2 * 3' }])
    expect(parseInline('`a ** b`')).toEqual([{ t: 'code', s: 'a ** b' }])
  })
  it('groups consecutive bullets and separates paragraphs', () => {
    const blocks = parseMd('Intro\n- one\n- **two**\n\nOutro')
    expect(blocks.map((b) => b.kind)).toEqual(['p', 'ul', 'p'])
    expect(blocks[1]).toMatchObject({ kind: 'ul', items: [[{ t: 'text', s: 'one' }], [{ t: 'b', s: 'two' }]] })
  })
  it('leaves html as inert text', () => {
    expect(parseInline('<script>x</script>')).toEqual([{ t: 'text', s: '<script>x</script>' }])
  })
})
