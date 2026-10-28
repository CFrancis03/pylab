import { useEffect, useRef, useState } from 'react'
import { exportSave, importSave, resetProgress, updateSettings, useProgress } from '../game/store'
import { pushToast } from '../game/toasts'
import { THEMES } from '../game/progress'
import { playSound } from '../game/sound'
import { cachePyodide, pyodideCached } from '../pwa'

export default function SettingsPage() {
  const { settings } = useProgress()
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [offline, setOffline] = useState<'checking' | 'ready' | 'missing' | { done: number; total: number } | 'failed'>('checking')

  useEffect(() => {
    let live = true
    void pyodideCached().then((ok) => live && setOffline(ok ? 'ready' : 'missing'))
    return () => {
      live = false
    }
  }, [])

  const downloadOffline = async () => {
    setOffline({ done: 0, total: 4 })
    try {
      await cachePyodide((done, total) => setOffline({ done, total }))
      setOffline('ready')
      pushToast('info', 'Python is saved for offline use.')
    } catch {
      setOffline('failed')
    }
  }

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
        <h2>Sound and motion</h2>
        <label className="check">
          <input type="checkbox" checked={settings.sound} onChange={(e) => { updateSettings({ sound: e.target.checked }); playSound('correct', e.target.checked) }} data-testid="sound" />
          Sound effects
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.motion} onChange={(e) => updateSettings({ motion: e.target.checked })} data-testid="motion" />
          Animations and celebrations
        </label>
        <p className="muted small">Animations also turn off automatically if your device is set to reduce motion.</p>
      </section>

      <section className="card setting">
        <h2>Offline use</h2>
        <p className="muted small">The lessons work offline once the site has loaded. Saving Python (about 13 MB) lets code challenges run offline too.</p>
        {offline === 'ready' ? (
          <p data-testid="offline-ready">✓ Python is saved on this device. Everything works offline.</p>
        ) : typeof offline === 'object' ? (
          <p role="status" data-testid="offline-progress">Saving Python… {offline.done}/{offline.total} files</p>
        ) : (
          <div className="row">
            <button onClick={() => void downloadOffline()} disabled={offline === 'checking'} data-testid="offline-download">Save Python for offline use</button>
            {offline === 'failed' && <span className="error-text" role="alert">That did not work. Check your connection and try again.</span>}
          </div>
        )}
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
