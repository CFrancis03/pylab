import { useState } from 'react'
import { regions } from '../content'
import { href } from '../router'
import Md from '../ui/Md'
import { buildSheet } from '../study/cheatsheet'

export default function CheatSheetPage() {
  const [chosen, setChosen] = useState<string[]>(() => regions.map((r) => r.id))
  const [facts, setFacts] = useState(true)
  const sheet = buildSheet(regions, chosen)
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  return (
    <main className="page sheet-page">
      <div className="no-print">
        <a className="back" href={href('/study')}>← Study</a>
        <h1>Cheat sheet</h1>
        <p className="muted">Every concept card and flashcard from the regions you pick, on one printable page. Use Print and choose “Save as PDF” to keep a copy.</p>
        <fieldset className="card setup">
          <legend>Include</legend>
          <div className="row wrap">
            <button className="ghost" onClick={() => setChosen(regions.map((r) => r.id))} data-testid="sheet-all">All</button>
            <button className="ghost" onClick={() => setChosen([])} data-testid="sheet-none">None</button>
          </div>
          <div className="check-grid">
            {regions.map((r) => (
              <label key={r.id}><input type="checkbox" checked={chosen.includes(r.id)} onChange={() => toggle(r.id)} data-testid={`sheet-region-${r.id}`} /> {r.emoji} {r.name}</label>
            ))}
          </div>
          <label><input type="checkbox" checked={facts} onChange={(e) => setFacts(e.target.checked)} data-testid="sheet-facts" /> Include quick facts (flashcards)</label>
          <div className="row"><button onClick={() => window.print()} disabled={sheet.length === 0} data-testid="print">🖨 Print / save as PDF</button></div>
        </fieldset>
      </div>

      {sheet.length === 0 && <p className="muted no-print">Pick at least one region.</p>}
      <div className="sheet" data-testid="sheet">
        {sheet.map((s) => (
          <section key={s.regionId} className="sheet-region" data-testid={`sheet-${s.regionId}`}>
            <h2>{s.emoji} {s.name}</h2>
            {s.concepts.map((c) => (
              <article key={c.title + c.lesson} className="sheet-concept">
                <h3>{c.title}</h3>
                <Md text={c.body} />
                {c.code && <pre className="code"><code>{c.code}</code></pre>}
              </article>
            ))}
            {facts && s.facts.length > 0 && (
              <div className="sheet-facts">
                <h3>Quick facts</h3>
                <dl>
                  {s.facts.map((f, i) => (
                    <div key={i}><dt><Md text={f.front} /></dt><dd><Md text={f.back} /></dd></div>
                  ))}
                </dl>
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
