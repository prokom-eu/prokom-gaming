import type { ReactNode } from 'react'

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'gold' | 'mu'

/**
 * Status: colour and shape and text together (panel spec §2) — ok dot, warn triangle, bad
 * diamond. Never colour alone (WCAG 1.4.1).
 */
export function Chip({ tone = 'mu', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`pn-chip pn-chip--${tone}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  )
}
