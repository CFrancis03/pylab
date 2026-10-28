export type Cue = 'correct' | 'wrong' | 'level' | 'badge' | 'win'

/** [frequency Hz, start s, length s] per note, played as soft sine/triangle blips. */
const NOTES: Record<Cue, { wave: OscillatorType; notes: [number, number, number][] }> = {
  correct: { wave: 'sine', notes: [[660, 0, 0.09], [880, 0.08, 0.14]] },
  wrong: { wave: 'triangle', notes: [[220, 0, 0.12], [165, 0.11, 0.18]] },
  level: { wave: 'sine', notes: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.3]] },
  badge: { wave: 'triangle', notes: [[988, 0, 0.1], [1319, 0.1, 0.3]] },
  win: { wave: 'sine', notes: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.1], [784, 0.42, 0.1], [1047, 0.52, 0.4]] },
}

let ctx: AudioContext | null = null

/** Play a cue if sound is switched on. Silent (and harmless) where Web Audio is unavailable. */
export function playSound(cue: Cue, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx ??= new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    const { wave, notes } = NOTES[cue]
    const t0 = ctx.currentTime
    for (const [freq, start, len] of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = wave
      osc.frequency.value = freq
      // A quick attack and a smooth decay keep it from clicking.
      gain.gain.setValueAtTime(0.0001, t0 + start)
      gain.gain.exponentialRampToValueAtTime(0.07, t0 + start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + len)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0 + start)
      osc.stop(t0 + start + len + 0.02)
    }
  } catch {
    // Audio is a nicety. Never let it break studying.
  }
}
