/** One graded check emitted by harness.py's check()/check_true(). */
export interface TestResult {
  name: string
  ok: boolean
  got?: string
  want?: string
}

export interface RunRequest {
  /** The learner's code. */
  code: string
  /** Hidden test snippet, run after `code` in the same namespace. */
  tests?: string
  /** Extra virtual files (path -> text), written under the sandbox cwd. */
  files?: Record<string, string>
  /** Preload the shared sample files (huck-finn.txt, data.bin, ...). Default true. */
  samples?: boolean
  /** Text fed to input()/sys.stdin, one line per entry. */
  stdin?: string
  /** sys.argv; defaults to ['main.py']. */
  argv?: string[]
}

export interface RunResult {
  /** True when the code ran without an uncaught exception and every check (if any) passed. */
  ok: boolean
  stdout: string
  stderr: string
  /** Cleaned Python traceback when the run raised. */
  error?: string
  /** Present when `tests` was supplied and the learner's code ran. */
  results?: TestResult[]
  timedOut: boolean
  /** Output was cut off at the size cap. */
  truncated: boolean
  durationMs: number
}

/** Worker -> main thread. */
export type WorkerOut =
  | { type: 'ready' }
  | { type: 'chunk'; id: number; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'done'; id: number; result: Omit<RunResult, 'timedOut' | 'durationMs'> }
  | { type: 'fatal'; message: string }

/** Main thread -> worker. */
export type WorkerIn = { type: 'run'; id: number; req: RunRequest }
