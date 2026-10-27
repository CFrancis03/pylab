import { loadPyodide, type PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import { executeRun, MAX_OUTPUT_CHARS } from './core'
import harness from './harness.py?raw'
import type { RunRequest } from './types'

let py: PyodideAPI

const run = (req: RunRequest) => {
  const chunks: string[] = []
  const result = executeRun(py, harness, req, (_s, t) => chunks.push(t))
  return { ...result, chunks }
}

beforeAll(async () => {
  py = await loadPyodide()
}, 120_000)

describe('stdout / stderr', () => {
  it('captures print output exactly, including end=""', () => {
    const r = run({ code: "print('a', end='')\nprint('b')\nprint('c')" })
    expect(r.stdout).toBe('ab\nc\n')
    expect(r.ok).toBe(true)
    expect(r.chunks.join('')).toBe(r.stdout)
  })

  it('captures stderr separately', () => {
    const r = run({ code: "import sys\nsys.stderr.write('oops')\nprint('fine')" })
    expect(r.stderr).toBe('oops')
    expect(r.stdout).toBe('fine\n')
  })

  it('handles multi-byte output', () => {
    expect(run({ code: "print('é 🙂')" }).stdout).toBe('é 🙂\n')
  })

  it('caps runaway output', () => {
    const r = run({ code: "for _ in range(5000):\n    print('x' * 100)" })
    expect(r.truncated).toBe(true)
    expect(r.stdout.length).toBeLessThanOrEqual(MAX_OUTPUT_CHARS)
  })
})

describe('errors', () => {
  it('reports a clean traceback pointing at main.py', () => {
    const r = run({ code: 'x = 1\nprint(1 / 0)' })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Traceback')
    expect(r.error).toContain('main.py')
    expect(r.error).toContain('ZeroDivisionError')
    expect(r.error).not.toContain('/lib/python')
  })

  it('reports syntax errors', () => {
    const r = run({ code: 'def f(:\n    pass' })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('SyntaxError')
  })

  it('treats sys.exit(0) as success and sys.exit(1) as failure', () => {
    expect(run({ code: 'import sys\nsys.exit(0)' }).ok).toBe(true)
    expect(run({ code: 'import sys\nsys.exit(1)' }).ok).toBe(false)
  })
})

describe('grading harness', () => {
  const tests = "check('double(2)', double(2), 4)\ncheck_true('negatives', double(-1) == -2)"

  it('passes a correct solution', () => {
    const r = run({ code: 'def double(x):\n    return x * 2', tests })
    expect(r.ok).toBe(true)
    expect(r.results).toHaveLength(2)
    expect(r.results!.every((x) => x.ok)).toBe(true)
  })

  it('fails a wrong solution with got/want', () => {
    const r = run({ code: 'def double(x):\n    return x + 1', tests })
    expect(r.ok).toBe(false)
    const first = r.results![0]
    expect(first).toMatchObject({ name: 'double(2)', ok: false, got: '3', want: '4' })
  })

  it('turns missing definitions into a visible failed check', () => {
    const r = run({ code: 'pass', tests })
    expect(r.ok).toBe(false)
    const crash = r.results!.find((x) => x.name === 'tests could not finish')
    expect(crash?.got).toContain("NameError: name 'double' is not defined")
  })

  it('does not run tests when the learner code crashes', () => {
    const r = run({ code: 'raise ValueError("no")', tests })
    expect(r.ok).toBe(false)
    expect(r.results).toBeUndefined()
  })
})

describe('isolation', () => {
  it('gives each run a fresh namespace', () => {
    run({ code: 'leaked = 123' })
    const r = run({ code: 'print(leaked)' })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('NameError')
  })

  it('wipes the working directory between runs', () => {
    run({ code: "open('scratch.txt', 'w').write('hi')\nimport os\nprint(os.path.exists('scratch.txt'))" })
    expect(run({ code: "import os\nprint(os.path.exists('scratch.txt'))" }).stdout).toBe('False\n')
  })

  it('does not cache learner modules across runs', () => {
    const a = run({ code: 'import helper\nprint(helper.VALUE)', files: { 'helper.py': 'VALUE = 1' } })
    const b = run({ code: 'import helper\nprint(helper.VALUE)', files: { 'helper.py': 'VALUE = 2' } })
    expect(a.stdout).toBe('1\n')
    expect(b.stdout).toBe('2\n')
  })

  it('supports packages from nested virtual files', () => {
    const r = run({
      code: 'from pkg import mod\nprint(mod.hello())',
      files: { 'pkg/__init__.py': '', 'pkg/mod.py': "def hello():\n    return 'hi'" },
    })
    expect(r.stdout).toBe('hi\n')
  })
})

describe('inputs', () => {
  it('feeds stdin to input() and raises EOFError when exhausted', () => {
    const r = run({ code: "a = input()\nb = input()\nprint(a + b)", stdin: 'x\ny' })
    expect(r.stdout).toBe('xy\n')
    const eof = run({ code: 'input()', stdin: '' })
    expect(eof.error).toContain('EOFError')
    // A trailing newline does not create an extra blank line.
    const trailing = run({ code: "print(repr(input()))\ninput()", stdin: 'x\n' })
    expect(trailing.stdout).toBe("'x'\n")
    expect(trailing.error).toContain('EOFError')
  })

  it('sets sys.argv and __name__', () => {
    const r = run({ code: "import sys\nprint(sys.argv, __name__)", argv: ['prog.py', '5'] })
    expect(r.stdout).toBe("['prog.py', '5'] __main__\n")
  })
})

describe('sample files', () => {
  it('ships the lecture binary record: >di10s', () => {
    const r = run({
      code: "import struct\nd = open('data.bin','rb').read()\nvf, vi, vs = struct.unpack('>di10s', d)\nprint(len(d), vf, vi, vs.decode())",
    })
    expect(r.stdout).toBe('22 3.14159 840 Hello 🙂\n')
  })

  it('has a BOM variant that plain utf-8 leaves on line 1', () => {
    const r = run({
      code: "print(repr(open('huck-finn-bom.txt').readline()))\nprint(repr(open('huck-finn-bom.txt', encoding='utf-8-sig').readline()))",
    })
    expect(r.stdout).toBe("'\\ufeffCHAPTER I.\\n'\n'CHAPTER I.\\n'\n")
  })

  it('has parseable csv and json', () => {
    const r = run({
      code:
        "import csv, json\nf = open('persons_of_concern.csv')\n[next(f) for _ in range(3)]\n" +
        "rows = list(csv.DictReader(f))\nprint(len(rows), rows[2]['country'])\n" +
        "print(json.load(open('example.json'))['siblings'][1]['name'])",
    })
    expect(r.stdout).toBe('4 Korea, Republic of\nKatie\n')
  })

  it('can be disabled', () => {
    const r = run({ code: "import os\nprint(os.listdir('.'))", samples: false })
    expect(r.stdout).toBe('[]\n')
  })
})
