import { mulberry32 } from '../study/rng'
import { useBurst } from './confetti'

const COLORS = ['#e0a100', '#2f8f4e', '#47bfff', '#ff7a66', '#b45cc4']

/** A brief shower of CSS confetti. The stylesheet hides it when animations are off or the OS asks for reduced motion. */
export default function Confetti() {
  const burst = useBurst()
  if (burst === 0) return null
  const rng = mulberry32(burst * 7919)
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    left: rng() * 100,
    delay: rng() * 0.5,
    dur: 1.6 + rng() * 1.4,
    drift: (rng() - 0.5) * 160,
    spin: 360 + rng() * 540,
    color: COLORS[i % COLORS.length],
  }))
  // Keyed by the burst number, so every new burst restarts the animation.
  return (
    <div className="confetti" key={burst} aria-hidden data-testid="confetti">
      {pieces.map((p, i) => (
        <span key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ['--drift' as string]: `${p.drift}px`, ['--spin' as string]: `${p.spin}deg` }} />
      ))}
    </div>
  )
}
