import { regionMeta, type RegionMeta } from './schema'

/**
 * The whole quest map. Positions are on a 1000x600 canvas, snaking left-to-right,
 * right-to-left, then left-to-right again.
 */
const raw = [
  { id: 'snake-nest', name: 'Snake Nest', lectures: [1, 2], emoji: '🥚', x: 100, y: 110,
    blurb: 'Why Python, how notebooks behave, and the habits of tidy code.' },
  { id: 'variable-valley', name: 'Variable Valley', lectures: [3], emoji: '🌿', x: 300, y: 80,
    blurb: 'Names, types, expressions and assignment.' },
  { id: 'loop-canyon', name: 'Loop Canyon', lectures: [4], emoji: '🏜️', x: 500, y: 120,
    blurb: 'if, while, for, range, break and continue.' },
  { id: 'function-forge', name: 'Function Forge', lectures: [5], emoji: '🔥', x: 700, y: 85,
    blurb: 'Defining functions, scope, and pass-by-object-reference.' },
  { id: 'slice-peaks', name: 'Slice Peaks', lectures: [6], emoji: '⛰️', x: 900, y: 115,
    blurb: 'Lists, tuples, indexing, slicing and sorting.' },
  { id: 'hash-harbor', name: 'Hash Harbor', lectures: [7], emoji: '⚓', x: 850, y: 300,
    blurb: 'Dictionaries and sets: fast lookups and set algebra.' },
  { id: 'generator-grotto', name: 'Generator Grotto', lectures: [8], emoji: '🕳️', x: 630, y: 270,
    blurb: 'Comprehensions, generators and lazy evaluation.' },
  { id: 'string-bazaar', name: 'String Bazaar', lectures: [9], emoji: '🛍️', x: 410, y: 310,
    blurb: 'String methods, formatting and Unicode.' },
  { id: 'regex-jungle', name: 'Regex Jungle', lectures: [10], emoji: '🌴', x: 190, y: 285,
    blurb: 'Pattern matching with regular expressions, plus reading files.' },
  { id: 'byte-caverns', name: 'Byte Caverns', lectures: [11], emoji: '💎', x: 190, y: 500,
    blurb: 'Writing files, binary data, struct, and the command line.' },
  { id: 'package-port', name: 'Package Port', lectures: [12], emoji: '📦', x: 410, y: 520,
    blurb: 'Modules, packages, imports and environments.' },
  { id: 'class-castle', name: 'Class Castle', lectures: [13, 14], emoji: '🏰', x: 630, y: 490,
    blurb: 'Classes, inheritance, properties and operator overloading.' },
  { id: 'exception-arena', name: 'Exception Arena', lectures: [15], emoji: '🏟️', x: 850, y: 520,
    blurb: 'Inheritance in depth, dataclasses, typing and exceptions.' },
]

export const regionMetas: RegionMeta[] = raw.map((r, i) =>
  regionMeta.parse({ id: r.id, order: i + 1, name: r.name, lectures: r.lectures, blurb: r.blurb, emoji: r.emoji, mapPos: { x: r.x, y: r.y } }),
)
