import type { Region } from '../content/schema'

/** "regex-groups" becomes "Regex groups". */
export function prettyTopic(t: string): string {
  const s = t.replace(/-/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export interface TopicHome {
  regionId: string
  regionName: string
  lessonId: string
}

/** The first lesson that teaches each topic, so a weak topic can link back to where it is explained. */
export function topicHomes(regions: Region[]): Map<string, TopicHome> {
  const homes = new Map<string, TopicHome>()
  for (const r of regions) {
    for (const l of r.lessons) {
      for (const a of l.activities) {
        if (!homes.has(a.topic)) homes.set(a.topic, { regionId: r.id, regionName: r.name, lessonId: l.id })
      }
    }
  }
  return homes
}
