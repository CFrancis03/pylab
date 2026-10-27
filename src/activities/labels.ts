import type { Activity } from '../content/schema'

export const TYPE_LABEL: Record<Activity['type'], string> = {
  concept: 'Concept', mcq: 'Quiz', 'predict-output': 'Predict the output', 'spot-bug': 'Spot the bug',
  parsons: 'Puzzle', 'code-challenge': 'Coding challenge', visualizer: 'Visualizer', minigame: 'Mini-game', flashcards: 'Flashcards',
}
