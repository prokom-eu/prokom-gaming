/**
 * Polish plural form: 1 zestaw, 2–4 zestawy (but 12–14 zestawów), 0 / 5+ zestawów.
 * `forms` = [one, few, many].
 */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(n)
  if (abs === 1) return forms[0]
  const lastTwo = abs % 100
  const last = abs % 10
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return forms[1]
  return forms[2]
}
