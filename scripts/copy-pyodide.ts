/** Copies the Pyodide runtime from node_modules into public/pyodide so it is self-hosted. */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'

const FILES = ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']
const src = new URL('../node_modules/pyodide/', import.meta.url)
const dst = new URL('../public/pyodide/', import.meta.url)

mkdirSync(dst, { recursive: true })
let copied = 0
for (const f of FILES) {
  const from = new URL(f, src)
  const to = new URL(f, dst)
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue
  copyFileSync(from, to)
  copied++
}
console.log(copied ? `pyodide: copied ${copied} file(s) to public/pyodide` : 'pyodide: public/pyodide up to date')
