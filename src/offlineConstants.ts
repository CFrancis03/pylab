/** Shared by the app, the service worker generator in vite.config.ts, and the offline download button. */
export const PYODIDE_CACHE = 'pylab-pyodide-v1'

/** The Pyodide runtime files the worker fetches (see scripts/copy-pyodide.ts). */
export const PYODIDE_FILES = ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']
