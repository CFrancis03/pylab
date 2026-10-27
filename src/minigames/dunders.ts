export interface DunderPair {
  /** What the learner sees on the left: Python syntax. */
  expr: string
  dunder: string
  /**
   * Python run by validate-content to prove the pair: `x` and `y` are instances of a class whose ONLY relevant
   * method is `dunder`, returning `ret`. The probe must call it.
   */
  probe: string
  ret: string
  /** Extra methods the probe needs to run, such as __exit__ for a with statement. */
  extra?: string
}

const p = (expr: string, dunder: string, ret: string, probe = expr, extra?: string): DunderPair => ({ expr, dunder, probe, ret, extra })

export const DUNDER_ROUNDS: { id: string; title: string; pairs: DunderPair[] }[] = [
  {
    id: 'dm-core',
    title: 'Everyday syntax',
    pairs: [
      p('len(x)', '__len__', '3'),
      p('x + y', '__add__', '1'),
      p('x[0]', '__getitem__', '1'),
      p('str(x)', '__str__', "'s'"),
      p('repr(x)', '__repr__', "'r'"),
      p('Square(4)', '__init__', 'None', 'type(x)()'),
    ],
  },
  {
    id: 'dm-ops',
    title: 'Operators and protocols',
    pairs: [
      p('x == y', '__eq__', 'True'),
      p('x < y', '__lt__', 'True'),
      p('3 + x', '__radd__', '1'),
      p('x()', '__call__', '1'),
      p('for i in x:', '__iter__', 'iter([])', 'for i in x:\n    pass'),
      p('1 in x', '__contains__', 'True'),
    ],
  },
  {
    id: 'dm-more',
    title: 'Deeper cuts',
    pairs: [
      p('bool(x)', '__bool__', 'True'),
      p('hash(x)', '__hash__', '1'),
      p('x[0] = 1', '__setitem__', 'None'),
      p('x * 2', '__mul__', '1'),
      p('x.missing', '__getattr__', '1'),
      p('with x:', '__enter__', 'x', 'with x:\n    pass', '    def __exit__(self, *a):\n        return False'),
    ],
  },
]

/** A fixed, non-obvious order for the right-hand column: stepping by 5 visits all six slots. */
export const shuffled = <T,>(items: T[]): T[] => items.map((_, i) => items[(i * 5 + 2) % items.length])
