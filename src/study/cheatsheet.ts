import type { Region } from '../content/schema'

export interface SheetConcept {
  lesson: string
  title: string
  body: string
  code?: string
}

export interface SheetSection {
  regionId: string
  name: string
  emoji: string
  concepts: SheetConcept[]
  /** Flashcard question and answer pairs: quick facts to scan. */
  facts: { front: string; back: string }[]
}

/** A study sheet built from the lessons' concept cards and flashcards, in map order. */
export function buildSheet(regions: Region[], regionIds: string[]): SheetSection[] {
  return regions
    .filter((r) => regionIds.includes(r.id))
    .map((r) => {
      const concepts: SheetConcept[] = []
      const facts: SheetSection['facts'] = []
      for (const l of r.lessons) {
        for (const a of l.activities) {
          if (a.type === 'concept') concepts.push({ lesson: l.title, title: a.title, body: a.body, code: a.code })
          else if (a.type === 'flashcards') facts.push(...a.cards)
        }
      }
      return { regionId: r.id, name: r.name, emoji: r.emoji, concepts, facts }
    })
}
