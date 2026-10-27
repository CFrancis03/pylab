/**
 * Sample files preloaded into every sandbox run, so lessons on files, CSV, JSON and
 * binary data can simply open() them. Contents mirror the lecture examples.
 */
export type SampleFile = string | Uint8Array

// First lines of Adventures of Huckleberry Finn (Mark Twain, 1884, public domain).
const HUCK = [
  'CHAPTER I.',
  '',
  "You don't know about me without you have read a book by the name of The",
  "Adventures of Tom Sawyer; but that ain't no matter.  That book was made by",
  'Mr. Mark Twain, and he told the truth, mainly.  There was things which he',
  'stretched, but mainly he told the truth.',
  '',
  'Now the way that the book winds up is this: Tom and me found the money that',
  'the robbers hid in the cave, and it made us rich.  We got six thousand',
  'dollars apiece--all gold.  Huckleberry Finn is what they call me.',
  '',
].join('\n')

const CSV = [
  'Persons of Concern (sample)',
  'Source: made-up data for practice',
  'Updated: 2026',
  'country,year,refugees,asylum_seekers',
  'Chad,2024,1200,300',
  'Peru,2024,540,2100',
  '"Korea, Republic of",2024,75,12',
  'Spain,2024,8800,5400',
  '',
].join('\n')

const JSON_TEXT = JSON.stringify(
  {
    name: 'Wes',
    places_lived: ['United States', 'Spain', 'Germany'],
    pet: null,
    siblings: [
      { name: 'Scott', age: 25, pet: 'Zuko' },
      { name: 'Katie', age: 33, pet: 'Cisco' },
    ],
  },
  null,
  2,
)

/** The 22-byte record from the binary-data lecture: >di10s -> 3.14159, 840, 'Hello 🙂'. */
const DATA_BIN = new Uint8Array([
  0x40, 0x09, 0x21, 0xf9, 0xf0, 0x1b, 0x86, 0x6e, // double 3.14159 (big-endian)
  0x00, 0x00, 0x03, 0x48, // int 840
  0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0xf0, 0x9f, 0x99, 0x82, // "Hello 🙂" (UTF-8)
])

export const SAMPLE_FILES: Record<string, SampleFile> = {
  'huck-finn.txt': HUCK,
  // Same text with a UTF-8 byte-order mark: reading it as 'utf-8' leaves a BOM (U+FEFF) on line 1.
  'huck-finn-bom.txt': '\ufeff' + HUCK,
  'persons_of_concern.csv': CSV,
  'example.json': JSON_TEXT,
  'data.bin': DATA_BIN,
}
