import { marginStatus, percent } from '../../lib/pricing/format'

/**
 * Margin as a bar with the minimum marked (panel spec §2). The scale ends at `scaleMax`
 * (default 20%), so 11% sits a bit past the middle like on the boards. Screens show the value in
 * text next to it; here it is the accessible name of the picture.
 */
export function MarginBar({
  margin,
  minMargin,
  warnMargin,
  scaleMax = 0.2,
}: {
  margin: number | null
  minMargin: number
  warnMargin: number
  scaleMax?: number
}) {
  const status = marginStatus(margin, minMargin, warnMargin)
  const at = (v: number) => `${Math.max(0, Math.min(100, (v / scaleMax) * 100))}%`
  return (
    <span
      className={status === 'ok' ? 'pn-mbar' : `pn-mbar pn-mbar--${status}`}
      role="img"
      aria-label={`Marża ${percent(margin)}, minimum ${percent(minMargin)}`}
      style={{ display: 'block' }}
    >
      <s style={{ width: at(margin ?? 0) }} />
      <u style={{ left: at(minMargin) }} />
    </span>
  )
}
