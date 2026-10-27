import type { Tone, Track } from './types'

const PREFIX: Record<Tone, string> = { idle: '', active: '▶ ', done: '✓ ', skipped: '⤼ ', found: '★ ', error: '✗ ' }

/** Rows of labelled chips. The prefix glyph repeats the tone, so colour is never the only signal. */
export default function TraceTracks({ tracks }: { tracks: Track[] }) {
  return (
    <div className="tracks" data-testid="tracks">
      {tracks.map((t) => (
        <div className="track" key={t.title}>
          <div className="track-title">{t.title}</div>
          <div className="chips">
            {t.chips.length === 0 && <span className="muted small">(empty)</span>}
            {t.chips.map((c, i) => (
              <span key={i} className={`chip ${c.tone ?? 'idle'}`}>{PREFIX[c.tone ?? 'idle']}{c.text}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
