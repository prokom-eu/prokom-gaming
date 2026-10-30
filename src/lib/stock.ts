/**
 * „Gotowe od ręki” (spec. §11, ADR-G005 `stock`): vocabulary and the rules that do not need costs.
 * The price of a unit = price of its configuration from the newest published batch minus the
 * unit's own discount (ADR-G002 §7, addendum 30.10.2026); the panel guards the margin.
 */

export const STOCK_LOCATIONS = [
  { value: 'rabka', label: 'Rabka-Zdrój', badge: 'wysyłka w 1–2 dni robocze' },
  { value: 'zakopane', label: 'Zakopane', badge: 'odbiór od ręki' },
] as const
export type StockLocation = (typeof STOCK_LOCATIONS)[number]['value']

export const STOCK_CONDITIONS = [
  { value: 'new', label: 'Nowy' },
  { value: 'demo', label: 'Pokazowy' },
  { value: 'returned', label: 'Po zwrocie' },
] as const

/** `context` flag of writes that change no price (reservation, seed): the margin guard skips them. */
export const SKIP_STOCK_GUARD = 'skipStockGuard'

/** A reservation from „Zarezerwuj” holds the unit for 24 hours (spec. §11). */
export const RESERVATION_MS = 24 * 60 * 60 * 1000

/** Reserved now: `reservedUntil` is in the future. */
export function isReserved(reservedUntil: string | null | undefined, now: number): boolean {
  if (!reservedUntil) return false
  const until = Date.parse(reservedUntil)
  return Number.isFinite(until) && until > now
}

/** Price of the unit; `null` when the discount would eat the whole price. */
export function stockPrice(
  configPrice: number,
  discount: number | null | undefined,
): number | null {
  const off = Math.max(0, discount ?? 0)
  const price = configPrice - off
  return price > 0 ? price : null
}

export const locationOf = (value: string) => STOCK_LOCATIONS.find((l) => l.value === value)
