import type { ComponentType } from 'react'
import DunderMatcher from './DunderMatcher'
import EndianPuzzle from './EndianPuzzle'
import ExceptionTree from './ExceptionTree'
import RegexHunter from './RegexHunter'
import SetVenn from './SetVenn'

export interface GameProps {
  onFinished: () => void
}

/** Every mini-game name the content schema allows. */
export const MINIGAME_VIEWS: Record<string, ComponentType<GameProps>> = {
  'regex-hunter': RegexHunter,
  'endian-puzzle': EndianPuzzle,
  'set-venn': SetVenn,
  'exception-tree': ExceptionTree,
  'dunder-matcher': DunderMatcher,
}
