import type { CSSProperties } from 'react'

import { LIGHTS, type LightKey } from '@/lib/buildPage'

/**
 * Light colour (decision of Krystian 28.10.2026: like „Dopasuj” on the build page, G9): the
 * creature's own light or one of six, no surcharge. The board Konfigurator has no picker — the
 * spec. §7 asks for the light in the preview, so the look follows `.bp-lights` of the board Zestaw.
 */
export function LightPicker({
  value,
  ownColor,
  onPick,
}: {
  value: LightKey | null
  ownColor: string
  onPick: (light: LightKey | null) => void
}) {
  return (
    <fieldset className="cf-lights">
      <legend className="cf-lbl">Kolor światła, bez dopłaty</legend>
      <div className="cf-lights__row">
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onPick(null)}
          style={{ '--lc': ownColor } as CSSProperties}
        >
          <i aria-hidden="true" />
          <small>Istoty</small>
        </button>
        {LIGHTS.map((l) => (
          <button
            key={l.key}
            type="button"
            aria-pressed={value === l.key}
            onClick={() => onPick(l.key)}
            style={{ '--lc': `var(--light-${l.key})` } as CSSProperties}
          >
            <i aria-hidden="true" />
            <small>{l.label}</small>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
