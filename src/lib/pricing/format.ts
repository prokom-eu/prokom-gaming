/**
 * Number formats for prices on the site, in the panel and in messages (Polish). Browser-safe; one
 * place, so every screen and mail shows amounts the same way.
 */

const GROUP = /\B(?=(\d{3})+(?!\d))/g

/**
 * "14 540 zł", "4 990 zł". Grouped by hand with a non-breaking space: `toLocaleString('pl-PL')`
 * leaves 4-digit numbers ungrouped ("4990 zł"), unlike the boards.
 */
export const zl = (value: number | null): string =>
  value === null ? '—' : `${String(Math.round(value)).replace(GROUP, ' ')} zł`

export const percent = (value: number | null, signed = false): string => {
  if (value === null || !Number.isFinite(value)) return '—'
  const text = `${(value * 100).toFixed(2).replace('.', ',')}%`
  return signed && value > 0 ? `+${text}` : text
}

export const signedZl = (value: number | null): string =>
  value === null ? '—' : value === 0 ? '0 zł' : `${value > 0 ? '+' : '−'}${zl(Math.abs(value))}`

/** A share as typed into a panel field, e.g. markup 0.1812 → "0,1812". */
export const share = (value: number): string => value.toFixed(4).replace('.', ',')

export type MarginStatus = 'ok' | 'warn' | 'bad'

/**
 * Margin thresholds of the panel (panel spec §2 "Statusy"): below `minMargin` bad, below
 * `warnMargin` warn, else ok. Shares (0.11), like `pricing-settings`. No margin = bad: a price
 * without cost must not look safe.
 */
export function marginStatus(
  margin: number | null,
  minMargin: number,
  warnMargin: number,
): MarginStatus {
  if (margin === null || !Number.isFinite(margin) || margin < minMargin) return 'bad'
  return margin < warnMargin ? 'warn' : 'ok'
}
