/**
 * Number formats for prices in the panel and its messages (Polish). Browser-safe; one place, so
 * the prices screen and the guard's messages show amounts the same way.
 */

export const zl = (value: number | null): string =>
  value === null ? '—' : `${Math.round(value).toLocaleString('pl-PL')} zł`

export const percent = (value: number | null, signed = false): string => {
  if (value === null || !Number.isFinite(value)) return '—'
  const text = `${(value * 100).toFixed(2).replace('.', ',')}%`
  return signed && value > 0 ? `+${text}` : text
}

export const signedZl = (value: number | null): string =>
  value === null ? '—' : value === 0 ? '0 zł' : `${value > 0 ? '+' : '−'}${zl(Math.abs(value))}`

/** A share as typed into a panel field, e.g. markup 0.1812 → "0,1812". */
export const share = (value: number): string => value.toFixed(4).replace('.', ',')
