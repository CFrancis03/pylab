import { useRef, useState } from 'react'
import { exportSave, importSave, resetProgress, updateSettings, useProgress } from '../game/store'
import { pushToast } from '../game/toasts'
import { THEMES } from '../game/progress'

export default function SettingsPage() {
  const { settings } = useProgress()
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportSave()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `python-lab-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      importSave(await file.text())
      setError(null)
      pushToast('info', 'Save file imported.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import that file.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <main className="page narrow">
      <h1>Settings</h1>

      <section className="card setting">
        <h2>Theme</h2>
        <div className="seg" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <label key={t} className={settings.theme === t ? 'on' : ''}>
              <input type="radio" name="theme" value={t} checked={settings.theme === t} onChange={() => updateSettings({ theme: t })} />
              {t === 'system' ? 'Match system' : t[0].toUpperCase() + t.slice(1)}
            </label>
          ))}
        </div>
      </section>

      <section className="card setting">
        <h2>Free roam</h2>
        <label className="check">
          <input type="checkbox" checked={settings.freeRoam} onChange={(e) => updateSettings({ freeRoam: e.target.checked })} data-testid="free-roam" />
          Open every region without beating the previous boss
        </label>
        <p className="muted small">Handy for jumping straight to the lecture you are studying for.</p>
      </section>

      <section className="card setting">
        <h2>Your save</h2>
        <p className="muted small">Progress lives in this browser only. Export it to back it up or move to another device.</p>
        <div className="row">
          <button onClick={download} data-testid="export">Export save</button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>Import save…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden data-testid="import" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
        {error && <p className="error-text" role="alert" data-testid="import-error">{error}</p>}
      </section>

      <section className="card setting">
        <h2>Reset progress</h2>
        <p className="muted small">Clears XP, completed activities, badges and streaks. Your settings are kept.</p>
        {confirmReset ? (
          <div className="row">
            <button className="danger" data-testid="reset-confirm" onClick={() => { resetProgress(); setConfirmReset(false); pushToast('info', 'Progress reset.') }}>Yes, erase my progress</button>
            <button className="ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <button className="ghost" data-testid="reset" onClick={() => setConfirmReset(true)}>Reset…</button>
        )}
      </section>
    </main>
  )
}
