/** Tiny, safe markdown subset for lesson text: paragraphs, "- " bullets, **bold**, *italic*, `code`. */
export type Inline = { t: 'text' | 'b' | 'i' | 'code'; s: string }
export type Block = { kind: 'p'; inline: Inline[] } | { kind: 'ul'; items: Inline[][] }

export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  for (const part of text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/)) {
    if (!part) continue
    if (part.startsWith('**')) out.push({ t: 'b', s: part.slice(2, -2) })
    else if (part.startsWith('`')) out.push({ t: 'code', s: part.slice(1, -1) })
    else if (part.startsWith('*')) out.push({ t: 'i', s: part.slice(1, -1) })
    else out.push({ t: 'text', s: part })
  }
  return out
}

export function parseMd(src: string): Block[] {
  const blocks: Block[] = []
  let list: Inline[][] | null = null
  for (const line of src.split('\n')) {
    const bullet = /^\s*-\s+(.*)$/.exec(line)
    if (bullet) {
      if (!list) {
        list = []
        blocks.push({ kind: 'ul', items: list })
      }
      list.push(parseInline(bullet[1]))
      continue
    }
    list = null
    if (line.trim()) blocks.push({ kind: 'p', inline: parseInline(line.trim()) })
  }
  return blocks
}
