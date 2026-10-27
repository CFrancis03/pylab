export interface TreeNode {
  name: string
  /** Hidden nodes start empty. The clue tells the learner which exception belongs in the slot. */
  clue?: string
  children?: TreeNode[]
}

export interface TreeLevel {
  id: string
  title: string
  root: TreeNode
}

const hid = (name: string, clue: string, children?: TreeNode[]): TreeNode => ({ name, clue, children })
const node = (name: string, children?: TreeNode[]): TreeNode => ({ name, children })

export const TREE_LEVELS: TreeLevel[] = [
  {
    id: 'et-lookup',
    title: 'Math and lookups',
    root: node('Exception', [
      node('ArithmeticError', [hid('ZeroDivisionError', 'raised by 10 / 0')]),
      node('LookupError', [hid('IndexError', 'raised by [1, 2, 3][9]'), hid('KeyError', "raised by {}['x']")]),
    ]),
  },
  {
    id: 'et-top',
    title: 'The top of the tree',
    root: node('BaseException', [
      hid('KeyboardInterrupt', 'raised when you press Ctrl+C'),
      hid('SystemExit', 'raised by sys.exit()'),
      node('Exception', [
        hid('ValueError', "raised by int('abc')"),
        hid('TypeError', "raised by 'a' + 1"),
        hid('StopIteration', 'raised by next() on an exhausted iterator'),
        node('OSError', [hid('FileNotFoundError', "raised by open('missing.txt')")]),
      ]),
    ]),
  },
  {
    id: 'et-deep',
    title: 'Deeper branches',
    root: node('Exception', [
      node('ValueError', [hid('UnicodeError', 'the parent of all encoding and decoding errors', [hid('UnicodeDecodeError', "raised by b'\\xff'.decode('utf-8')")])]),
      node('RuntimeError', [hid('NotImplementedError', 'raised in a method that subclasses must override')]),
      hid('AttributeError', 'raised by None.missing'),
    ]),
  },
]

/** Every hidden node with its parent's name, in reading order. */
export function hiddenSlots(root: TreeNode): { name: string; clue: string; parent: string }[] {
  const out: { name: string; clue: string; parent: string }[] = []
  const walk = (n: TreeNode) => {
    for (const c of n.children ?? []) {
      if (c.clue) out.push({ name: c.name, clue: c.clue, parent: n.name })
      walk(c)
    }
  }
  walk(root)
  return out
}

/** Every (parent, child) edge in the tree. */
export function edges(root: TreeNode): [string, string][] {
  const out: [string, string][] = []
  const walk = (n: TreeNode) => {
    for (const c of n.children ?? []) {
      out.push([n.name, c.name])
      walk(c)
    }
  }
  walk(root)
  return out
}
