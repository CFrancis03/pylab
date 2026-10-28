# Python Lab

An interactive quest-map for studying CSCI 503/490 Python. It is a static site that runs **real Python in the browser** (Pyodide in a Web Worker), with XP, levels, streaks, boss battles, code challenges, visualizers and mini-games. Progress is saved in your browser's `localStorage`.

**Live site:** https://cfrancis03.github.io/pylab/

## Study tools

Under **Study** in the header:

- **Review mode:** a quiz that favours your weakest topics and the questions you have missed.
- **Mock exam:** mixed questions from the regions you choose, optionally timed, with a per-topic breakdown.
- **Daily flashcards:** a spaced-repetition deck (new cards a few at a time, then 1, 3, 7, 14 and 30 day reviews).
- **Dashboard:** accuracy, progress by region, weakest topics and exam history.
- **Cheat sheet:** every concept card and flashcard on one printable page (print to PDF).

Review and exam answers count toward your stats and streak but never pay XP or mark lessons complete.

## Offline, speed and accessibility

- **Works offline.** A service worker (generated at build time) caches the app, so lessons work with no connection after the first visit. **Settings → Offline use** also saves the 13 MB Python runtime so code challenges run offline. The runtime lives in its own long-lived cache, so a new deploy never re-downloads it. When a new version is ready, a banner offers "Reload to update" and never reloads mid-quiz.
- **Fast first load.** The map and study pages load only the app, React and zod (about 205 kB gzipped). The code editor (CodeMirror), each mini-game and the Python runtime load only when an activity needs them.
- **Accessible.** The whole site passes an axe-core audit (WCAG 2.1 AA and best practice) in light and dark themes at desktop and phone widths, with no horizontal scrolling at 375 px. There is a skip link, focus moves to the page on navigation, and the code editor is not a keyboard trap (press Esc, then Tab, to leave it).
- **Sound and motion.** Optional synthesized sound effects (off by default) and a switch for animations and confetti. Animations also turn off automatically when the device asks for reduced motion.

## Develop

```bash
npm install
npm run dev               # http://localhost:5173 (also copies the Pyodide runtime into public/pyodide)
npm test                  # unit tests
npm run lint
npm run validate-content  # runs every authored Python answer under local CPython (needs python3)
npm run verify-pyodide    # runs them again inside Pyodide, the engine learners actually use
npm run build
```

Dev-only playground for every visualizer and mini-game: `#/dev/viz`.

## Content

Lessons are data in `src/content/` (one file per region, validated by a zod schema). `npm run validate-content` checks every code-challenge solution, predict-the-output answer, visualizer scenario and mini-game level against real CPython, so an authored answer cannot be wrong.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` lints, tests, validates the content, builds with `VITE_BASE=/<repo>/` and publishes `dist/` on every push to `main`.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions.**

The site uses hash routing, so it needs no server rewrites, and Pyodide is self-hosted so it works with no CDN.
