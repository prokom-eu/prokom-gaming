const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7]

/** NIP as stored: digits only, without separators or the `PL` prefix. */
export function normalizeNip(value: string): string {
  return value.replace(/^\s*PL/i, '').replace(/[\s-]/g, '')
}

/** Polish NIP: 10 digits with a valid check digit (same rule as prokom-web). */
export function isValidNip(value: string): boolean {
  const nip = normalizeNip(value)
  if (!/^\d{10}$/.test(nip)) return false
  const digits = [...nip].map(Number)
  const sum = NIP_WEIGHTS.reduce((acc, weight, i) => acc + weight * (digits[i] as number), 0)
  return sum % 11 === digits[9]
}
