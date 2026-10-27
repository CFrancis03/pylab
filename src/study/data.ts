import { regions } from '../content'
import { buildDeck } from './deck'
import { quizItems } from './items'
import { topicHomes } from './topics'

/** Derived once: the authored content never changes while the app runs. */
export const ITEMS = quizItems(regions)
export const DECK = buildDeck(regions)
export const HOMES = topicHomes(regions)
