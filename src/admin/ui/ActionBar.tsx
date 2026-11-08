import type { ReactNode } from 'react'

/**
 * Action under the thumb on a phone (spec §2a pt 6), fixed above the tabs: the key number of the
 * screen and its main button. Hidden on a computer, where the same action sits in the card next
 * to the numbers — so compute the values once and pass them to both.
 */
export function ActionBar({
  value,
  note,
  tone,
  children,
}: {
  value: string
  note: string
  tone?: 'ok' | 'warn' | 'bad'
  children: ReactNode
}) {
  return (
    <div className="pn-mact" role="region" aria-label="Akcja ekranu">
      <span className="pn-mact__v">
        <b style={tone ? { color: `var(--p-${tone})` } : undefined}>{value}</b>
        <small>{note}</small>
      </span>
      {children}
    </div>
  )
}
