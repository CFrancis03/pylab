/// <reference lib="webworker" />
import { loadPyodide } from 'pyodide'
import { executeRun } from './core'
import harnessSrc from './harness.py?raw'
import type { WorkerIn, WorkerOut } from './types'

const post = (m: WorkerOut) => self.postMessage(m)

// Pyodide is self-hosted (see scripts/copy-pyodide.ts), so the site works offline.
const indexURL = new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.href).href
const pyodide = loadPyodide({ indexURL })

pyodide.then(
  () => post({ type: 'ready' }),
  (e: unknown) => post({ type: 'fatal', message: e instanceof Error ? e.message : String(e) }),
)

self.onmessage = async (ev: MessageEvent<WorkerIn>) => {
  const msg = ev.data
  if (msg.type !== 'run') return
  try {
    const py = await pyodide
    const result = executeRun(py, harnessSrc, msg.req, (stream, text) =>
      post({ type: 'chunk', id: msg.id, stream, text }),
    )
    post({ type: 'done', id: msg.id, result })
  } catch (e) {
    post({ type: 'fatal', message: e instanceof Error ? e.message : String(e) })
  }
}
