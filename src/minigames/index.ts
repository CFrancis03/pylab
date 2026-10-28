import { lazy, type ComponentType } from 'react'

export interface GameProps {
  onFinished: () => void
}

/** Every mini-game name the content schema allows. Each loads on demand, only when its activity is opened. */
export const MINIGAME_VIEWS: Record<string, ComponentType<GameProps>> = {
  'regex-hunter': lazy(() => import('./RegexHunter')),
  'endian-puzzle': lazy(() => import('./EndianPuzzle')),
  'set-venn': lazy(() => import('./SetVenn')),
  'exception-tree': lazy(() => import('./ExceptionTree')),
  'dunder-matcher': lazy(() => import('./DunderMatcher')),
}
