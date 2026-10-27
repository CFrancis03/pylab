import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves a project site from /<repo>/, so the deploy workflow sets VITE_BASE=/pylab/.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  // Pyodide ships its own loader; pre-bundling it breaks asset resolution.
  optimizeDeps: { exclude: ['pyodide'] },
  worker: { format: 'es' },
})
