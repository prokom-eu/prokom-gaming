import type { CSSProperties } from 'react'

import './fireflies.css'

/**
 * Where the fireflies are, in % of the scene, kept at the sides (the text and the computer are
 * in the middle): [x, y, size px, duration s, delay s, drift px]. Fixed, so the server render is
 * the same every time.
 */
const DOTS: readonly [number, number, number, number, number, number][] = [
  [6, 58, 3, 9, 0, 18],
  [11, 74, 2, 11, 2.5, -14],
  [17, 49, 2.5, 10, 5, 22],
  [22, 66, 2, 12, 1.2, -18],
  [27, 82, 3, 9.5, 3.8, 12],
  [9, 88, 2, 13, 6.4, -20],
  [73, 61, 2.5, 10.5, 0.8, -16],
  [78, 79, 2, 12.5, 4.2, 20],
  [83, 52, 3, 9, 2, -12],
  [88, 70, 2, 11.5, 5.6, 16],
  [93, 85, 2.5, 10, 1.6, -22],
  [96, 63, 2, 13.5, 3.2, 14],
]

/**
 * Fireflies over a creature scene (runda v2 §3.2: one animated layer of particles), in the
 * creature colour `--c` of the parent. CSS only and decorative; shown on a desktop width with
 * motion allowed (ADR-G003 §5), hidden otherwise.
 */
export function Fireflies() {
  return (
    <div className="fireflies" aria-hidden="true">
      {DOTS.map(([x, y, size, duration, delay, drift]) => (
        <span
          key={`${x}-${y}`}
          style={
            {
              left: `${x}%`,
              top: `${y}%`,
              '--ff-size': `${size}px`,
              '--ff-dur': `${duration}s`,
              '--ff-delay': `${-delay}s`,
              '--ff-drift': `${drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
