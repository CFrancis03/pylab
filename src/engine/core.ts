import type { PyodideAPI } from 'pyodide'
import { SAMPLE_FILES } from './samples'
import type { RunRequest, RunResult, TestResult } from './types'

/** Output cap per stream, in characters. Stops `while True: print(...)` from flooding the UI. */
export const MAX_OUTPUT_CHARS = 100_000

const WORK_DIR = '/work'

const PREP = `
import os, shutil, sys, importlib
os.chdir('/')  # Emscripten's FS can't remove the current directory
shutil.rmtree('${WORK_DIR}', ignore_errors=True)
os.makedirs('${WORK_DIR}')
os.chdir('${WORK_DIR}')
if '${WORK_DIR}' not in sys.path:
    sys.path.insert(0, '${WORK_DIR}')
importlib.invalidate_caches()
`

// Drop modules the learner's own files imported so the next run starts clean.
const CLEANUP = `
import sys
for _n, _m in list(sys.modules.items()):
    _f = getattr(_m, '__file__', None)
    if isinstance(_f, str) and _f.startswith('${WORK_DIR}'):
        del sys.modules[_n]
`

/** Internal Pyodide/CPython frames the learner shouldn't have to read. */
const INTERNAL_FRAME = /^\s*File "(\/lib\/python|\/lib\/pyodide|\/home\/pyodide|[^"]*_pyodide)/

export function cleanTraceback(message: string): string {
  const out: string[] = []
  let skipping = false
  for (const line of message.trimEnd().split('\n')) {
    if (INTERNAL_FRAME.test(line)) {
      skipping = true
      continue
    }
    // Source / caret lines belong to the frame header above them.
    if (skipping && /^\s{4,}/.test(line)) continue
    skipping = false
    out.push(line)
  }
  return out.join('\n')
}

function lastLine(text: string): string {
  const lines = text.trimEnd().split('\n')
  return lines[lines.length - 1] ?? ''
}

type Emit = (stream: 'stdout' | 'stderr', text: string) => void

function writeFiles(py: PyodideAPI, files: Record<string, string | Uint8Array>) {
  for (const [rel, data] of Object.entries(files)) {
    const path = `${WORK_DIR}/${rel}`
    const dir = path.slice(0, path.lastIndexOf('/'))
    if (dir !== WORK_DIR) py.FS.mkdirTree(dir)
    py.FS.writeFile(path, data)
  }
}

/**
 * Run one request on an initialised Pyodide instance. Every run gets a fresh namespace
 * and a clean working directory; stdout/stderr are streamed through `emit`.
 */
export function executeRun(
  py: PyodideAPI,
  harnessSrc: string,
  req: RunRequest,
  emit: Emit,
): Omit<RunResult, 'timedOut' | 'durationMs'> {
  const decoders = { stdout: new TextDecoder(), stderr: new TextDecoder() }
  const sizes = { stdout: 0, stderr: 0 }
  const captured = { stdout: '', stderr: '' }
  let truncated = false

  const sink = (stream: 'stdout' | 'stderr') => ({
    write(buf: Uint8Array) {
      const text = decoders[stream].decode(buf, { stream: true })
      if (sizes[stream] >= MAX_OUTPUT_CHARS) {
        truncated = true
        return buf.length
      }
      const room = MAX_OUTPUT_CHARS - sizes[stream]
      const piece = text.length > room ? text.slice(0, room) : text
      if (piece.length < text.length) truncated = true
      sizes[stream] += piece.length
      captured[stream] += piece
      emit(stream, piece)
      return buf.length
    },
  })

  py.setStdout(sink('stdout'))
  py.setStderr(sink('stderr'))

  // '' means "no input at all" (immediate EOF); one trailing newline doesn't add a blank line.
  const stdinText = (req.stdin ?? '').replace(/\n$/, '')
  const stdinLines = req.stdin ? stdinText.split('\n') : []
  let stdinPos = 0
  py.setStdin({
    // Returning undefined signals EOF; input() then raises EOFError like a real terminal.
    stdin: () => (stdinPos < stdinLines.length ? stdinLines[stdinPos++] : undefined),
  })

  const scratch = py.globals.get('dict')()
  const g = py.globals.get('dict')()
  let error: string | undefined
  let results: TestResult[] | undefined

  try {
    py.runPython(PREP, { globals: scratch })
    writeFiles(py, { ...(req.samples === false ? {} : SAMPLE_FILES), ...(req.files ?? {}) })

    g.set('__name__', '__main__')
    g.set('__argv__', py.toPy(req.argv ?? ['main.py']))
    py.runPython('import sys; sys.argv = list(__argv__)', { globals: g })
    py.runPython(harnessSrc, { globals: g, filename: 'harness.py' })

    let userOk = true
    try {
      py.runPython(req.code, { globals: g, filename: 'main.py' })
    } catch (e) {
      userOk = false
      const msg = e instanceof Error ? e.message : String(e)
      // sys.exit(0) is a normal way for scripts to finish.
      if (/SystemExit: (0|None)?\s*$/.test(msg.trim())) userOk = true
      else error = cleanTraceback(msg)
    }

    if (userOk && req.tests !== undefined) {
      try {
        py.runPython(req.tests, { globals: g, filename: 'tests.py' })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        error = cleanTraceback(msg)
        // Typically the learner didn't define something the tests call. Keep it a visible failure.
        g.set('__crash__', lastLine(msg))
        py.runPython("_results.append({'name': 'tests could not finish', 'ok': False, 'got': __crash__})", {
          globals: g,
        })
      }
      results = JSON.parse(py.runPython('import json; json.dumps(_results)', { globals: g })) as TestResult[]
    }
  } catch (e) {
    error = `Sandbox error: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    try {
      // Python buffers partial lines; deliver anything still pending before we tear down.
      py.runPython('import sys; sys.stdout.flush(); sys.stderr.flush()', { globals: scratch })
    } catch {
      /* best effort */
    }
    try {
      py.runPython(CLEANUP, { globals: scratch })
    } catch {
      /* best effort */
    }
    g.destroy()
    scratch.destroy()
    // Flush any partial multi-byte sequence the decoders were holding.
    for (const s of ['stdout', 'stderr'] as const) {
      const tail = decoders[s].decode()
      if (tail && sizes[s] < MAX_OUTPUT_CHARS) {
        captured[s] += tail
        emit(s, tail)
      }
    }
  }

  const ok = error === undefined && (results === undefined || results.every((r) => r.ok))
  return { ok, stdout: captured.stdout, stderr: captured.stderr, error, results, truncated }
}
