import type { CSSProperties } from 'react'

import './scene-fx.css'

/** The one animated layer a scene gets besides the mist (runda v3 PREMIUM §2.4), by creature key. */
type Effect = 'snow' | 'embers' | 'storm' | 'water'
const EFFECTS: Partial<Record<string, Effect>> = {
  zima: 'snow', // Pani Zimy
  zmij: 'embers',
  perun: 'storm',
  wodnik: 'water',
  rusalka: 'water',
  weles: 'water',
}

/** A fixed pseudo-random sequence (0…1), so the server render is the same every time. */
function seq(count: number, seed: number): number[] {
  let x = seed
  return Array.from({ length: count }, () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  })
}

const SNOW = seq(36 * 4, 7)
const EMBERS = seq(16 * 4, 11)

function particles(kind: 'snow' | 'embers') {
  const count = kind === 'snow' ? 36 : 16
  const r = kind === 'snow' ? SNOW : EMBERS
  return Array.from({ length: count }, (_, i) => {
    const [a = 0, b = 0, c = 0, d = 0] = r.slice(i * 4, i * 4 + 4)
    const style = {
      left: `${(a * 100).toFixed(1)}%`,
      '--fx-size': `${(kind === 'snow' ? 2 + b * 3 : 2 + b * 2).toFixed(1)}px`,
      '--fx-dur': `${(kind === 'snow' ? 9 + c * 9 : 5 + c * 5).toFixed(1)}s`,
      '--fx-delay': `${(-d * 18).toFixed(1)}s`,
      '--fx-drift': `${((b - 0.5) * 80).toFixed(0)}px`,
    } as CSSProperties
    return <span key={i} style={style} />
  })
}

/**
 * Depth by motion for a scene drawn in code (runda v3 PREMIUM §2.4, ADR-G014 pt 5): two mist
 * bands drifting slowly in opposite directions over the horizon, and at most one more animated
 * layer — falling snow (Pani Zimy), rising embers (Żmij), a rare lightning flash (Perun) or the
 * trembling reflection of water (Wodnik, Rusałka, Weles). CSS only, transform and opacity,
 * decorative; like the fireflies only on a desktop width with motion allowed (ADR-G003 §5).
 */
export function SceneFx({ id }: { id: string }) {
  const effect = EFFECTS[id]
  return (
    <div className="scene-fx" data-fx={effect ?? 'mist'} aria-hidden="true">
      <span className="scene-fx__mist" />
      <span className="scene-fx__mist scene-fx__mist--back" />
      {(effect === 'snow' || effect === 'embers') && (
        <span className={`scene-fx__${effect}`}>{particles(effect)}</span>
      )}
      {effect === 'storm' && <span className="scene-fx__flash" />}
      {effect === 'water' && <span className="scene-fx__water" />}
    </div>
  )
}
