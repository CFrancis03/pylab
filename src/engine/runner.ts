import type { RunRequest, RunResult, WorkerIn, WorkerOut } from './types'

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'running' | 'restarting'

export interface RunOptions {
  /** Hard limit for the run itself (loading Pyodide does not count). Default 5000 ms. */
  timeoutMs?: number
  /** Streamed output as it is produced. */
  onChunk?: (stream: 'stdout' | 'stderr', text: string) => void
  /** Abort the run (the Stop button). Same recovery path as a timeout. */
  signal?: AbortSignal
}

let worker: Worker | null = null
let ready: Promise<void> | null = null
let status: EngineStatus = 'idle'
let nextId = 1
let queue: Promise<unknown> = Promise.resolve()
const listeners = new Set<(s: EngineStatus) => void>()

function setStatus(s: EngineStatus) {
  status = s
  listeners.forEach((l) => l(s))
}

export const getEngineStatus = () => status

export function subscribeEngineStatus(fn: (s: EngineStatus) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function spawn(restarting: boolean): Promise<void> {
  setStatus(restarting ? 'restarting' : 'loading')
  const w = new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' })
  worker = w
  ready = new Promise<void>((resolve, reject) => {
    const onMsg = (ev: MessageEvent<WorkerOut>) => {
      if (ev.data.type === 'ready') {
        w.removeEventListener('message', onMsg)
        if (worker === w) setStatus('ready')
        resolve()
      } else if (ev.data.type === 'fatal') {
        w.removeEventListener('message', onMsg)
        reject(new Error(ev.data.message))
      }
    }
    w.addEventListener('message', onMsg)
    w.addEventListener('error', (e) => reject(new Error(e.message || 'Python worker failed to start')))
  })
  // A failed start must be retryable.
  ready.catch(() => {
    if (worker === w) {
      worker = null
      ready = null
      setStatus('idle')
    }
  })
  return ready
}

/** Start loading Pyodide in the background (e.g. when a code activity is about to open). */
export function warmUp(): Promise<void> {
  return worker && ready ? ready : spawn(false)
}

function execute(req: RunRequest, opts: RunOptions): Promise<RunResult> {
  const timeoutMs = opts.timeoutMs ?? 5000
  return new Promise<RunResult>((resolve) => {
    void (async () => {
      let w: Worker
      try {
        await warmUp()
        w = worker!
      } catch (e) {
        resolve({
          ok: false, stdout: '', stderr: '', truncated: false, timedOut: false, durationMs: 0,
          error: `Python could not start: ${e instanceof Error ? e.message : String(e)}`,
        })
        return
      }

      const id = nextId++
      const started = performance.now()
      let stdout = ''
      let stderr = ''
      let settled = false

      const finish = (r: RunResult) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        opts.signal?.removeEventListener('abort', onAbort)
        w.removeEventListener('message', onMsg)
        resolve(r)
      }

      // Killing the worker is the only reliable way to stop `while True:`; a fresh one loads in the background.
      const kill = (error: string, timedOut: boolean) => {
        w.terminate()
        if (worker === w) {
          worker = null
          ready = null
          void spawn(true).catch(() => {})
        }
        finish({
          ok: false, stdout, stderr, truncated: false, timedOut, error,
          durationMs: performance.now() - started,
        })
      }

      const onMsg = (ev: MessageEvent<WorkerOut>) => {
        const m = ev.data
        if (m.type === 'chunk' && m.id === id) {
          if (m.stream === 'stdout') stdout += m.text
          else stderr += m.text
          opts.onChunk?.(m.stream, m.text)
        } else if (m.type === 'done' && m.id === id) {
          setStatus('ready')
          finish({ ...m.result, timedOut: false, durationMs: performance.now() - started })
        } else if (m.type === 'fatal') {
          kill(`Python crashed: ${m.message}`, false)
        }
      }
      const onAbort = () => kill('Stopped.', false)
      const timer = setTimeout(
        () => kill(`Timed out after ${(timeoutMs / 1000).toFixed(1)}s. Is there an infinite loop?`, true),
        timeoutMs,
      )

      w.addEventListener('message', onMsg)
      opts.signal?.addEventListener('abort', onAbort)
      if (opts.signal?.aborted) return onAbort()
      setStatus('running')
      w.postMessage({ type: 'run', id, req } satisfies WorkerIn)
    })()
  })
}

/** Run Python in the sandbox. Runs are serialised; each gets a fresh namespace. */
export function runPython(req: RunRequest, opts: RunOptions = {}): Promise<RunResult> {
  const p = queue.then(() => execute(req, opts))
  queue = p.catch(() => {})
  return p
}
