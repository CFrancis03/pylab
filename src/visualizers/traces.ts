import { src } from '../content/helpers'
import { MRO_SCENARIOS } from './mro'
import type { Chip, Tone, Track, TraceFrame, TraceScenario } from './types'

const chip = (text: string, tone: Tone = 'idle'): Chip => ({ text, tone })
const track = (title: string, ...chips: Chip[]): Track => ({ title, chips })
const frame = (line: number, note: string, tracks: Track[], out: string[] = []): TraceFrame => ({ line, note, tracks, out })

// ───────────────────────── short-circuit
const scAndOr: TraceScenario = {
  id: 'sc-and-or',
  family: 'short-circuit',
  title: 'and / or skip work',
  code: src(
    'def check(name, result):',
    '    print("checking", name)',
    '    return result',
    '',
    'if check("A", False) and check("B", True):',
    '    print("both")',
    'print(check("C", 0) or check("D", "fallback"))',
  ),
  expectedOutput: 'checking A\nchecking C\nchecking D\nfallback',
  frames: [
    frame(5, '`and` evaluates its LEFT side first: check("A", False) is called.', [track('A and B', chip('A', 'active'), chip('B'))]),
    frame(2, 'check prints its name before returning, so the output shows exactly which operands ran.', [track('A and B', chip('A', 'active'), chip('B'))], ['checking A']),
    frame(5, 'A gave False. For `and`, a falsy left side already decides the result, so B is never called. That is short-circuiting.', [track('A and B', chip('A → False', 'done'), chip('B never evaluated', 'skipped'))], ['checking A']),
    frame(7, '`or` also starts on the left: check("C", 0) is called.', [track('C or D', chip('C', 'active'), chip('D'))], ['checking A']),
    frame(2, 'C prints its name.', [track('C or D', chip('C', 'active'), chip('D'))], ['checking A', 'checking C']),
    frame(7, '0 is falsy and `or` wants a truthy answer, so it must go on to the right side: check("D", "fallback").', [track('C or D', chip('C → 0', 'done'), chip('D', 'active'))], ['checking A', 'checking C']),
    frame(2, 'D prints its name.', [track('C or D', chip('C → 0', 'done'), chip('D', 'active'))], ['checking A', 'checking C', 'checking D']),
    frame(7, '`or` returns the first truthy operand it finds, "fallback". Note that it returns the operand itself, not True.', [track('C or D', chip('C → 0', 'done'), chip('D → "fallback"', 'found'))], ['checking A', 'checking C', 'checking D', 'fallback']),
  ],
}

const scGuard: TraceScenario = {
  id: 'sc-guard',
  family: 'short-circuit',
  title: 'The guard pattern',
  code: src('items = []', 'if items and items[0] > 5:', '    print("big first")', 'else:', '    print("empty or small")', 'print(items or "default")'),
  expectedOutput: 'empty or small\ndefault',
  frames: [
    frame(1, 'items is an empty list, and empty containers are falsy.', [track('value', chip('items = []', 'active'))]),
    frame(2, 'The `and` starts with its left operand, `items`. It is falsy.', [track('items and items[0] > 5', chip('items → []', 'done'), chip('items[0] > 5'))]),
    frame(2, 'So the right side never runs. Evaluating items[0] on an empty list would raise IndexError, and the short-circuit is what protects us. This "check, then use" guard is the main practical use.', [track('items and items[0] > 5', chip('items → []', 'done'), chip('items[0] > 5 never evaluated', 'skipped'))]),
    frame(5, 'The condition is falsy, so the else branch runs.', [track('if condition', chip('falsy → else branch', 'found'))], ['empty or small']),
    frame(6, '`items or "default"`: items is falsy, so `or` moves on to the right operand.', [track('items or "default"', chip('items → []', 'done'), chip('"default"', 'active'))], ['empty or small']),
    frame(6, 'The first truthy operand wins. This is a common way to supply a default value.', [track('items or "default"', chip('items → []', 'done'), chip('"default"', 'found'))], ['empty or small', 'default']),
  ],
}

// ───────────────────────── generators
const state = (text: string, tone: Tone) => track('generator state', chip(text, tone))
const yielded = (...v: string[]) => track('values handed out', ...v.map((x) => chip(x, 'found')))

const genBasic: TraceScenario = {
  id: 'gen-basic',
  family: 'generator-stepper',
  title: 'yield pauses the function',
  code: src(
    'def count_up(n):',
    '    i = 1',
    '    while i <= n:',
    '        yield i',
    '        i += 1',
    '    print("finished")',
    '',
    'g = count_up(2)',
    'print(next(g))',
    'print(next(g))',
    'for x in g:',
    '    print("loop", x)',
  ),
  expectedOutput: '1\n2\nfinished',
  frames: [
    frame(8, 'Calling a generator function runs NONE of its body. It only builds a generator object, which is waiting to be started.', [state('created, not started', 'idle'), yielded()]),
    frame(9, 'next(g) starts the body and runs it until the first yield.', [state('running', 'active'), yielded()]),
    frame(4, 'yield 1 hands the value back and PAUSES the function right here. Its local variables (i = 1) are kept.', [state('suspended at yield, i = 1', 'done'), yielded('1')]),
    frame(9, 'The yielded value is what next(g) returned, so print shows it.', [state('suspended at yield, i = 1', 'done'), yielded('1')], ['1']),
    frame(10, 'The second next(g) RESUMES just after the yield: i += 1, the while test passes, and the loop reaches yield again.', [state('running', 'active'), yielded('1')], ['1']),
    frame(4, 'Paused again, now holding i = 2.', [state('suspended at yield, i = 2', 'done'), yielded('1', '2')], ['1']),
    frame(10, 'print shows 2.', [state('suspended at yield, i = 2', 'done'), yielded('1', '2')], ['1', '2']),
    frame(11, 'A for loop calls next(g) for you, resuming the paused generator.', [state('running', 'active'), yielded('1', '2')], ['1', '2']),
    frame(6, 'i becomes 3, the while test fails, and the function body runs off its end. No new value is yielded, so the loop body will not run.', [state('running', 'active'), yielded('1', '2')], ['1', '2', 'finished']),
    frame(11, 'Finishing the body raises StopIteration internally. The for loop treats that as "no more items" and stops quietly. The generator is now used up.', [state('exhausted', 'skipped'), yielded('1', '2')], ['1', '2', 'finished']),
  ],
}

const genLazy: TraceScenario = {
  id: 'gen-lazy',
  family: 'generator-stepper',
  title: 'Lazy evaluation',
  code: src(
    'def noisy(n):',
    '    for i in range(n):',
    '        print("making", i)',
    '        yield i * i',
    '',
    'squares = noisy(3)',
    'print("created")',
    'first = next(squares)',
    'print("got", first)',
    'rest = list(squares)',
    'print(rest)',
  ),
  expectedOutput: 'created\nmaking 0\ngot 0\nmaking 1\nmaking 2\n[1, 4]',
  frames: [
    frame(6, 'noisy(3) builds the generator. No squares are computed yet.', [state('created, not started', 'idle'), yielded()]),
    frame(7, 'The proof: "created" printed but "making ..." did not. Values are produced only when someone asks for them.', [state('created, not started', 'idle'), yielded()], ['created']),
    frame(8, 'next() runs the body just until the first yield.', [state('running', 'active'), yielded()], ['created']),
    frame(3, 'Only now does "making 0" print.', [state('running', 'active'), yielded()], ['created', 'making 0']),
    frame(4, 'yield 0 * 0 hands back 0 and pauses.', [state('suspended at yield', 'done'), yielded('0')], ['created', 'making 0']),
    frame(9, 'first holds the single value that was asked for.', [state('suspended at yield', 'done'), yielded('0')], ['created', 'making 0', 'got 0']),
    frame(10, 'list() keeps calling next() until the generator is exhausted, so the rest of the work happens now: 1 and 4.', [state('running', 'active'), yielded('0', '1', '4')], ['created', 'making 0', 'got 0', 'making 1', 'making 2']),
    frame(11, 'rest only has [1, 4]. The 0 was already consumed by the first next(), and a generator can only be read once.', [state('exhausted', 'skipped'), yielded('0', '1', '4')], ['created', 'making 0', 'got 0', 'making 1', 'making 2', '[1, 4]']),
  ],
}

// ───────────────────────── hash tables
/** Eight slots; ints hash to themselves so every slot number below can be checked by hand. */
const buckets = (slots: Record<number, Chip[]>): Track[] =>
  Array.from({ length: 8 }, (_, i) => ({ title: `slot ${i}`, chips: slots[i] ?? [] }))

const htInsert: TraceScenario = {
  id: 'ht-insert',
  family: 'hash-table',
  title: 'Inserting and colliding',
  code: src('d = {}', 'd[3] = "cat"', 'd[11] = "dog"', 'd[19] = "emu"', 'print(d[11])', 'print(d)'),
  expectedOutput: "dog\n{3: 'cat', 11: 'dog', 19: 'emu'}",
  frames: [
    frame(1, 'A dict is a hash table: an array of slots. The key\'s hash picks where to look first. Here there are 8 slots, and for an int hash(n) is n itself, so the starting slot is n & 7. (CPython\'s real probing is more elaborate, and strings use a randomised hash, so this is a simplified picture.)', buckets({})),
    frame(2, 'hash(3) = 3, and 3 & 7 = 3. Slot 3 is empty, so the key goes there.', buckets({ 3: [chip('3 → "cat"', 'active')] })),
    frame(3, 'hash(11) = 11, and 11 & 7 = 3 as well. Slot 3 is taken by a DIFFERENT key: a collision. Python probes another slot (here simply the next one) and stores 11 there.', buckets({ 3: [chip('3 → "cat"', 'skipped')], 4: [chip('11 → "dog"', 'active')] })),
    frame(4, '19 & 7 = 3 again. Slots 3 and 4 are both occupied by other keys, so it lands in slot 5.', buckets({ 3: [chip('3 → "cat"', 'skipped')], 4: [chip('11 → "dog"', 'skipped')], 5: [chip('19 → "emu"', 'active')] })),
    frame(5, 'Lookup repeats the same walk: start at slot 3. The key there is 3, not 11, so keep going. Slot 4 holds 11, which matches.', buckets({ 3: [chip('3 ≠ 11', 'skipped')], 4: [chip('11 → "dog"', 'found')], 5: [chip('19 → "emu"')] })),
    frame(5, 'Lookups stay fast because most keys are found in the first slot or two.', buckets({ 3: [chip('3 → "cat"')], 4: [chip('11 → "dog"', 'found')], 5: [chip('19 → "emu"')] }), ['dog']),
    frame(6, 'Printing a dict shows items in insertion order, not slot order. Since Python 3.7 that order is guaranteed.', buckets({ 3: [chip('3 → "cat"')], 4: [chip('11 → "dog"')], 5: [chip('19 → "emu"')] }), ['dog', "{3: 'cat', 11: 'dog', 19: 'emu'}"]),
  ],
}

const htUnhashable: TraceScenario = {
  id: 'ht-unhashable',
  family: 'hash-table',
  title: 'Why lists cannot be keys',
  code: src('d = {}', 'try:', '    d[[1, 2]] = "list key"', 'except TypeError:', '    print("unhashable list key")', 'd[(1, 2)] = "tuple key"', 'print(d[(1, 2)])'),
  expectedOutput: 'unhashable list key\ntuple key',
  frames: [
    frame(3, 'To store a key, Python first computes hash(key) to decide the slot.', [track('key', chip('[1, 2]', 'active')), track('hash(key)', chip('...'))]),
    frame(3, 'A list can change after it is stored. Its hash would change with it, and the entry would be in the wrong slot forever. So lists have no hash at all.', [track('key', chip('[1, 2]', 'error')), track('hash(key)', chip('TypeError: unhashable', 'error'))]),
    frame(5, 'The TypeError is caught, so the program carries on instead of crashing.', [track('key', chip('[1, 2]', 'error')), track('hash(key)', chip('unhashable', 'error'))], ['unhashable list key']),
    frame(6, 'A tuple of immutable items cannot change, so its hash is computed from its contents and stays valid.', [track('key', chip('(1, 2)', 'active')), track('hash(key)', chip('an int, same every time', 'found'))], ['unhashable list key']),
    frame(7, 'Looking up an equal tuple gives the same hash, so the same slot, and the value is found.', [track('key', chip('(1, 2)', 'found')), track('hash(key)', chip('same int as before', 'found'))], ['unhashable list key', 'tuple key']),
  ],
}

// ───────────────────────── imports
const impSearch: TraceScenario = {
  id: 'imp-search',
  family: 'import-resolution',
  title: 'How an import is found',
  code: src('import json', 'print(json.__name__)', 'import json', 'print("second import was instant")'),
  expectedOutput: 'json\nsecond import was instant',
  frames: [
    frame(1, 'import json: first Python looks in sys.modules, a dict of every module already imported.', [track('1. sys.modules cache', chip('json?', 'active')), track('2. sys.path search, in order', chip('script folder'), chip('standard library'), chip('site-packages'))]),
    frame(1, 'Not cached, so it searches the folders in sys.path in order, and the first match wins. No json.py next to the script.', [track('1. sys.modules cache', chip('json: not cached', 'skipped')), track('2. sys.path search, in order', chip('script folder: no json', 'skipped'), chip('standard library', 'active'), chip('site-packages'))]),
    frame(1, 'Found in the standard library. Python runs that file ONCE, builds a module object and stores it in sys.modules.', [track('1. sys.modules cache', chip('json: stored', 'found')), track('2. sys.path search, in order', chip('script folder: no json', 'skipped'), chip('standard library: found', 'found'), chip('site-packages: never reached', 'skipped'))]),
    frame(2, 'The name json now refers to the module object.', [track('1. sys.modules cache', chip('json: stored', 'done')), track('2. sys.path search, in order', chip('(finished)'))], ['json']),
    frame(3, 'The second import finds json in sys.modules already: it is reused, with no searching and no re-running of the file.', [track('1. sys.modules cache', chip('json: cache hit', 'found')), track('2. sys.path search, in order', chip('not needed', 'skipped'))], ['json']),
    frame(4, 'That is why importing the same module from many files is cheap.', [track('1. sys.modules cache', chip('json: cache hit', 'done')), track('2. sys.path search, in order', chip('not needed', 'skipped'))], ['json', 'second import was instant']),
  ],
}

const impMain: TraceScenario = {
  id: 'imp-main',
  family: 'import-resolution',
  title: 'The __main__ guard',
  code: src('print(__name__)', 'def main():', '    print("running as a script")', 'if __name__ == "__main__":', '    main()'),
  expectedOutput: '__main__\nrunning as a script',
  frames: [
    frame(1, 'Before running a file, Python sets its __name__. A file started directly (python script.py) gets "__main__".', [track('how the file was started', chip('python script.py', 'active'), chip('import script')), track('__name__', chip('"__main__"', 'found'))], ['__main__']),
    frame(2, 'def only creates the function. Nothing inside it runs yet.', [track('how the file was started', chip('python script.py', 'active'), chip('import script')), track('__name__', chip('"__main__"', 'done'))], ['__main__']),
    frame(4, 'The guard compares __name__ with "__main__". They match, so the block runs.', [track('how the file was started', chip('python script.py', 'active'), chip('import script')), track('guard __name__ == "__main__"', chip('True', 'found'))], ['__main__']),
    frame(5, 'main() runs.', [track('how the file was started', chip('python script.py', 'active'), chip('import script')), track('guard __name__ == "__main__"', chip('True', 'found'))], ['__main__', 'running as a script']),
    frame(4, 'Had another file imported this one instead, __name__ would be "script", the guard would be False, and main() would NOT run. That is the point: the file works both as a script and as an importable module.', [track('how the file was started', chip('python script.py', 'skipped'), chip('import script', 'active')), track('guard __name__ == "script"', chip('False: main() skipped', 'skipped'))], ['__main__', 'running as a script']),
  ],
}

// ───────────────────────── exceptions
const blocks = (t: Tone, e: Tone, l: Tone, f: Tone): Track =>
  track('blocks', chip('try', t), chip('except ZeroDivisionError', e), chip('else', l), chip('finally', f))

const excFlow: TraceScenario = {
  id: 'exc-flow',
  family: 'exception-flow',
  title: 'try / except / else / finally',
  code: src(
    'def run(x):',
    '    try:',
    '        print("try", x)',
    '        result = 10 / x',
    '    except ZeroDivisionError:',
    '        print("except")',
    '    else:',
    '        print("else", result)',
    '    finally:',
    '        print("finally")',
    '',
    'run(2)',
    'run(0)',
  ),
  expectedOutput: 'try 2\nelse 5.0\nfinally\ntry 0\nexcept\nfinally',
  frames: [
    frame(12, 'run(2): the four blocks are ready. Watch which of them execute.', [blocks('idle', 'idle', 'idle', 'idle')]),
    frame(3, 'The try block starts running.', [blocks('active', 'idle', 'idle', 'idle')], ['try 2']),
    frame(4, '10 / 2 works, so no exception is raised and the try block finishes normally.', [blocks('done', 'idle', 'idle', 'idle')], ['try 2']),
    frame(8, 'No exception, so except is skipped and else runs. Code in else is outside the try, so errors there are not caught by this try.', [blocks('done', 'skipped', 'active', 'idle')], ['try 2', 'else 5.0']),
    frame(10, 'finally runs no matter what happened.', [blocks('done', 'skipped', 'done', 'active')], ['try 2', 'else 5.0', 'finally']),
    frame(13, 'run(0): a fresh call, so the blocks start again.', [blocks('idle', 'idle', 'idle', 'idle')], ['try 2', 'else 5.0', 'finally']),
    frame(3, 'The try block starts.', [blocks('active', 'idle', 'idle', 'idle')], ['try 2', 'else 5.0', 'finally', 'try 0']),
    frame(4, '10 / 0 raises ZeroDivisionError. The rest of the try block is abandoned immediately.', [blocks('error', 'idle', 'idle', 'idle')], ['try 2', 'else 5.0', 'finally', 'try 0']),
    frame(6, 'The except clause matches the exception type and handles it. else is skipped because something was raised.', [blocks('error', 'active', 'skipped', 'idle')], ['try 2', 'else 5.0', 'finally', 'try 0', 'except']),
    frame(10, 'finally runs again.', [blocks('error', 'done', 'skipped', 'active')], ['try 2', 'else 5.0', 'finally', 'try 0', 'except', 'finally']),
  ],
}

const callTracks = (a: [Tone, Tone], b: [Tone, Tone]): Track[] => [
  track('inside risky()', chip('try', a[0]), chip('finally', a[1])),
  track('the caller', chip('try', b[0]), chip('except ValueError', b[1])),
]

const excPropagate: TraceScenario = {
  id: 'exc-propagate',
  family: 'exception-flow',
  title: 'Exceptions travel up',
  code: src(
    'def risky():',
    '    try:',
    '        print("start")',
    '        return int("abc")',
    '    finally:',
    '        print("cleanup")',
    '',
    'try:',
    '    risky()',
    'except ValueError:',
    '    print("caught outside")',
  ),
  expectedOutput: 'start\ncleanup\ncaught outside',
  frames: [
    frame(9, 'The caller is inside its own try block and calls risky().', callTracks(['idle', 'idle'], ['active', 'idle'])),
    frame(3, 'risky() enters its try block.', callTracks(['active', 'idle'], ['active', 'idle']), ['start']),
    frame(4, 'int("abc") raises ValueError. risky() has no except clause for it, so the exception starts travelling up the call stack.', callTracks(['error', 'idle'], ['active', 'idle']), ['start']),
    frame(6, 'Even while an exception is escaping, finally still runs. That is what makes it the right place for cleanup such as closing files.', callTracks(['error', 'active'], ['active', 'idle']), ['start', 'cleanup']),
    frame(10, 'The exception reaches the caller, whose except clause names ValueError, so it matches.', callTracks(['error', 'done'], ['error', 'active']), ['start', 'cleanup']),
    frame(11, 'The handler runs, and the program carries on normally.', callTracks(['error', 'done'], ['error', 'found']), ['start', 'cleanup', 'caught outside']),
  ],
}

export const TRACES: Record<string, TraceScenario> = Object.fromEntries(
  [scAndOr, scGuard, genBasic, genLazy, htInsert, htUnhashable, impSearch, impMain, excFlow, excPropagate, ...MRO_SCENARIOS].map((s) => [s.id, s]),
)
