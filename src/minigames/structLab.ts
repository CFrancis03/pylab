export type Order = '<' | '>'
export type Code = 'B' | 'b' | 'H' | 'h' | 'I' | 'i' | 'Q' | 'q'

export const CODES: { code: Code; size: number; signed: boolean; name: string }[] = [
  { code: 'B', size: 1, signed: false, name: 'unsigned byte' },
  { code: 'b', size: 1, signed: true, name: 'signed byte' },
  { code: 'H', size: 2, signed: false, name: 'unsigned short' },
  { code: 'h', size: 2, signed: true, name: 'signed short' },
  { code: 'I', size: 4, signed: false, name: 'unsigned int' },
  { code: 'i', size: 4, signed: true, name: 'signed int' },
  { code: 'Q', size: 8, signed: false, name: 'unsigned long long' },
  { code: 'q', size: 8, signed: true, name: 'signed long long' },
]

export const sizeOf = (c: Code): number => CODES.find((x) => x.code === c)?.size ?? 0

export const formatString = (order: Order, fields: Code[]): string => order + fields.join('')

/** Parse "00 01 ff" (any spacing) into byte values. */
export const parseHex = (hex: string): number[] => hex.split(/\s+/).filter(Boolean).map((h) => parseInt(h, 16))

export type Unpacked = { ok: true; values: string[] } | { ok: false; error: string }

/** `struct.unpack(order + fields, data)` for the standard (non-native) sizes. Values come back as decimal strings. */
export function unpack(order: Order, fields: Code[], data: number[]): Unpacked {
  const need = fields.reduce((n, f) => n + sizeOf(f), 0)
  if (need !== data.length) return { ok: false, error: `unpack requires a buffer of ${need} bytes` }
  const values: string[] = []
  let pos = 0
  for (const f of fields) {
    const spec = CODES.find((x) => x.code === f)
    if (!spec) return { ok: false, error: `bad char in struct format` }
    const bytes = data.slice(pos, pos + spec.size)
    pos += spec.size
    if (order === '<') bytes.reverse()
    let v = 0n
    for (const b of bytes) v = (v << 8n) | BigInt(b)
    if (spec.signed && v >= 1n << BigInt(spec.size * 8 - 1)) v -= 1n << BigInt(spec.size * 8)
    values.push(v.toString())
  }
  return { ok: true, values }
}

export interface EndianLevel {
  id: string
  title: string
  story: string
  /** Space-separated hex bytes. */
  bytes: string
  /** What `struct.unpack` must produce, as decimal strings. */
  target: string[]
  /** One way to do it. Verified under CPython. */
  solution: { order: Order; fields: Code[] }
  hint: string
}

export const ENDIAN_LEVELS: EndianLevel[] = [
  {
    id: 'en-little',
    title: 'Least significant first',
    story: 'A device sent two bytes. Read them as one unsigned 16-bit number equal to 256.',
    bytes: '00 01',
    target: ['256'],
    solution: { order: '<', fields: ['H'] },
    hint: 'Little-endian (<) stores the least significant byte first, so 00 01 means 0x0100.',
  },
  {
    id: 'en-big',
    title: 'Network byte order',
    story: 'Four bytes from a network packet. Read them as one unsigned 32-bit number equal to 42.',
    bytes: '00 00 00 2a',
    target: ['42'],
    solution: { order: '>', fields: ['I'] },
    hint: 'Big-endian (>) reads bytes in the order you see them, like writing a number on paper.',
  },
  {
    id: 'en-two',
    title: 'Two fields',
    story: 'A record holds two unsigned 16-bit values, stored little-endian. Extract them as 1 and 2.',
    bytes: '01 00 02 00',
    target: ['1', '2'],
    solution: { order: '<', fields: ['H', 'H'] },
    hint: 'Add a second field. The format string is just the codes in order, such as <HH.',
  },
  {
    id: 'en-signed',
    title: 'Signed values',
    story: 'These two bytes are a signed big-endian 16-bit integer. Read the value -2.',
    bytes: 'ff fe',
    target: ['-2'],
    solution: { order: '>', fields: ['h'] },
    hint: 'A lowercase code is signed (two\'s complement). The unsigned version would give 65534.',
  },
  {
    id: 'en-minus-one',
    title: 'All ones',
    story: 'Four bytes of ff. Read them as the value -1.',
    bytes: 'ff ff ff ff',
    target: ['-1'],
    solution: { order: '<', fields: ['i'] },
    hint: 'Byte order does not matter here, since every byte is the same. Signedness does.',
  },
  {
    id: 'en-wide',
    title: 'Eight bytes',
    story: 'An 8-byte big-endian counter. Read it as a single unsigned number equal to 256.',
    bytes: '00 00 00 00 00 00 01 00',
    target: ['256'],
    solution: { order: '>', fields: ['Q'] },
    hint: 'Q is the 8-byte code. With the wrong order the answer is enormous.',
  },
  {
    id: 'en-mixed',
    title: 'A mixed record',
    story: 'Little-endian record: a 32-bit unsigned count and a 16-bit unsigned flag. Extract 1 and 32767.',
    bytes: '01 00 00 00 ff 7f',
    target: ['1', '32767'],
    solution: { order: '<', fields: ['I', 'H'] },
    hint: 'The record is 6 bytes: 4 for the first field, 2 for the second.',
  },
]
