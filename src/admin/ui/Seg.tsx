'use client'

import { Segmented } from '../../components/ui/Segmented'

/**
 * Segments of the panel (single choice, e.g. "Ceny z partii / Dzisiejsze koszty"): the site's
 * radio group (arrows, one tab stop) in the panel look; on a phone it scrolls sideways.
 */
export function Seg<T extends string>(props: {
  label: string
  options: readonly { value: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (value: T) => void
}) {
  return <Segmented {...props} className="pn-seg" />
}
