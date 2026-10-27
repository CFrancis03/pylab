import { parseInline, parseMd, type Inline } from './md'

function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.t === 'b' ? <strong key={i}>{p.s}</strong>
        : p.t === 'i' ? <em key={i}>{p.s}</em>
        : p.t === 'code' ? <code key={i}>{p.s}</code>
        : <span key={i}>{p.s}</span>,
      )}
    </>
  )
}

/** Renders lesson text as React elements (never raw HTML). */
export default function Md({ text }: { text: string }) {
  return (
    <div className="md">
      {parseMd(text).map((b, i) =>
        b.kind === 'p' ? (
          <p key={i}><Inlines parts={b.inline} /></p>
        ) : (
          <ul key={i}>{b.items.map((it, j) => <li key={j}><Inlines parts={it} /></li>)}</ul>
        ),
      )}
    </div>
  )
}

/** Inline-only markup (`code`, **bold**, *italic*) for short strings: options, explanations, card faces. */
export function Rich({ text }: { text: string }) {
  return <Inlines parts={parseInline(text)} />
}
