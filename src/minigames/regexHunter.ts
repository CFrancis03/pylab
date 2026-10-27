export interface RegexLevel {
  id: string
  title: string
  goal: string
  text: string
  /** A pattern that solves the level. Run by validate-content, and used to compute the target matches. */
  solution: string
  /** What `solution` matches, in order. Shown to the learner as the list to find. */
  expected: string[]
  hint: string
}

export const REGEX_LEVELS: RegexLevel[] = [
  {
    id: 'rx-digits',
    title: 'Numbers',
    goal: 'Match every whole number.',
    text: 'Order 66 shipped 3 items on day 12 of 2024.',
    solution: String.raw`\d+`,
    expected: ['66', '3', '12', '2024'],
    hint: String.raw`\d is one digit. Add a quantifier to allow more than one.`,
  },
  {
    id: 'rx-phone',
    title: 'Phone numbers',
    goal: 'Match phone numbers written as 3 digits, a dash, then 4 digits. Skip the malformed ones.',
    text: 'Call 555-1234 or 555-9876, not 55-123 or 5551234.',
    solution: String.raw`\b\d{3}-\d{4}\b`,
    expected: ['555-1234', '555-9876'],
    hint: String.raw`{3} means exactly three. \b marks a word edge, which stops a match starting inside a longer number.`,
  },
  {
    id: 'rx-caps',
    title: 'Capitalised words',
    goal: 'Match each word that starts with a capital letter, whole word.',
    text: 'Alice met Bob in Paris, but carol stayed in rome.',
    solution: String.raw`\b[A-Z][a-z]+`,
    expected: ['Alice', 'Bob', 'Paris'],
    hint: '[A-Z] is one capital letter. Follow it with lowercase letters.',
  },
  {
    id: 'rx-email',
    title: 'Email addresses',
    goal: 'Match the email addresses (name@host.tld, and the host may have several dots).',
    text: 'Write to ann@site.org or bob@mail.example.com, not @nobody or me@.',
    solution: String.raw`\w+@\w+(?:\.\w+)+`,
    expected: ['ann@site.org', 'bob@mail.example.com'],
    hint: String.raw`A dot must be escaped: \. Repeat a group of ".word" with (?:...)+`,
  },
  {
    id: 'rx-groups',
    title: 'Capture groups',
    goal: 'Match each date and capture the year, month and day as THREE groups.',
    text: 'Due 2024-03-15, paid 2023-12-01.',
    solution: String.raw`(\d{4})-(\d{2})-(\d{2})`,
    expected: ['2024-03-15', '2023-12-01'],
    hint: 'Each pair of parentheses makes one group. m.groups() returns what they captured.',
  },
  {
    id: 'rx-lazy',
    title: 'Greedy vs lazy',
    goal: 'Match each HTML tag separately: <b>, </b>, <i>, </i>.',
    text: '<b>bold</b> and <i>italic</i>',
    solution: '<.+?>',
    expected: ['<b>', '</b>', '<i>', '</i>'],
    hint: '.+ is greedy and grabs as much as it can. A ? after a quantifier makes it lazy.',
  },
  {
    id: 'rx-backref',
    title: 'Repeated words',
    goal: 'Match each word that is immediately repeated, such as "is is".',
    text: 'this is is a test of of the the system',
    solution: String.raw`\b(\w+) \1\b`,
    expected: ['is is', 'of of', 'the the'],
    hint: String.raw`Capture a word with (\w+), then \1 means "the same text as group 1".`,
  },
]

/** The match list for one pattern: `[start, end, groups]` per match. Capped so an empty pattern cannot flood the page. */
export type MatchSpan = [number, number, (string | null)[]]

export interface HunterRun {
  user?: MatchSpan[]
  /** Python's message when the pattern is not valid. */
  error?: string
  target: MatchSpan[]
}

/** Python that reads pattern.txt / solution.txt / text.txt and prints one JSON object with both match lists. */
export const HUNTER_PY = [
  'import re, json',
  "pat = open('pattern.txt', encoding='utf-8').read()",
  "sol = open('solution.txt', encoding='utf-8').read()",
  "text = open('text.txt', encoding='utf-8').read()",
  'def spans(p):',
  '    return [[m.start(), m.end(), list(m.groups())] for _, m in zip(range(200), re.finditer(p, text))]',
  'out = {}',
  'try:',
  "    out['user'] = spans(pat)",
  'except re.error as e:',
  "    out['error'] = str(e)",
  "out['target'] = spans(sol)",
  'print(json.dumps(out))',
].join('\n')

export const sameMatches = (a: MatchSpan[], b: MatchSpan[]): boolean => JSON.stringify(a) === JSON.stringify(b)
