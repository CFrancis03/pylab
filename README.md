# Python Lab

An interactive quest-map for studying CSCI 503/490 Python. It is a static site that runs **real Python in the browser** (Pyodide in a Web Worker), with XP, levels, streaks, boss battles, code challenges, visualizers and mini-games. Progress is saved in your browser's `localStorage`.

**Live site:** https://cfrancis03.github.io/pylab/

## Develop

```bash
npm install
npm run dev               # http://localhost:5173 (also copies the Pyodide runtime into public/pyodide)
npm test                  # unit tests
npm run lint
npm run validate-content  # runs every authored Python answer under local CPython (needs python3)
npm run build
```

Dev-only playground for every visualizer and mini-game: `#/dev/viz`.

## Content

Lessons are data in `src/content/` (one file per region, validated by a zod schema). `npm run validate-content` checks every code-challenge solution, predict-the-output answer, visualizer scenario and mini-game level against real CPython, so an authored answer cannot be wrong.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` lints, tests, validates the content, builds with `VITE_BASE=/<repo>/` and publishes `dist/` on every push to `main`.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions.**

The site uses hash routing, so it needs no server rewrites, and Pyodide is self-hosted so it works with no CDN.
