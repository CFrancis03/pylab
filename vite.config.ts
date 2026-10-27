import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pyodide ships its own loader; pre-bundling it breaks asset resolution.
  optimizeDeps: { exclude: ['pyodide'] },
  worker: { format: 'es' },
})
