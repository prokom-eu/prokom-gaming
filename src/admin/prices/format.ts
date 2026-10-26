/** Number formats of the prices screen (Polish, like the rest of the panel). */

export const zl = (value: number | null): string =>
  value === null ? '—' : `${value.toLocaleString('pl-PL')} zł`

export const percent = (value: number | null, signed = false): string => {
  if (value === null || !Number.isFinite(value)) return '—'
  const text = `${(value * 100).toFixed(2).replace('.', ',')}%`
  return signed && value > 0 ? `+${text}` : text
}

export const signedZl = (value: number | null): string =>
  value === null ? '—' : value === 0 ? '0 zł' : `${value > 0 ? '+' : '−'}${zl(Math.abs(value))}`
