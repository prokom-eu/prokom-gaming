import type { CSSProperties } from 'react'

import { Sigil } from '@/components/Sigil'
import type { WorkshopItem } from '@/lib/orders'

/** The five stages every computer goes through (spec. §4 pt 7, names from the board). */
const STAGES = ['Części', 'Montaż', 'Test obciążeniowy', 'Pomiar klatek', 'Metryka i wysyłka']

/**
 * "Teraz w warsztacie w Rabce" under the hero (spec. §4 pt 2, board Main `.tick5`). With current
 * orders (`loadWorkshop()`, the same data as `GET /api/warsztat`): sigil, build name and stage —
 * never who ordered (ADR-G005) — and the "live" dot. Without orders it shows the fixed process.
 * The board's „Tablica warsztatu” link is left out: `/warsztat` is outside 20.11 (spec. §14).
 * The list scrolls sideways when it does not fit, so it takes focus — keyboard users scroll it
 * with arrows (axe `scrollable-region-focusable`).
 */
export function WorkshopStrip({ items = [] }: { items?: readonly WorkshopItem[] }) {
  const live = items.length > 0
  return (
    <section className="workshop" aria-labelledby="workshop-title">
      <h2 id="workshop-title" className="workshop__title">
        {live && <span className="workshop__live" aria-hidden="true" />}
        Teraz w warsztacie w Rabce
      </h2>
      {live ? (
        <ul
          className="workshop__list workshop__list--live"
          tabIndex={0}
          aria-labelledby="workshop-title"
        >
          {items.map((item, i) => (
            <li
              key={`${item.slug}-${i}`}
              style={{ '--c': `var(--c-${item.slug})` } as CSSProperties}
            >
              <Sigil id={item.key} size={22} className="workshop__sigil" />
              <b>{item.name}</b>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ol className="workshop__list" tabIndex={0} aria-labelledby="workshop-title">
          {STAGES.map((stage) => (
            <li key={stage}>{stage}</li>
          ))}
        </ol>
      )}
    </section>
  )
}
