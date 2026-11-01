/**
 * Shops whose offer pages may be linked as cost sources (ADR-G007 §5). No marketplaces (Ceneo,
 * Allegro): they mix in third-party offers. P7 moves the list to `price-check-settings`; until
 * then this is the starting list.
 */
export const DEFAULT_SHOPS = ['x-kom.pl', 'morele.net', 'komputronik.pl'] as const

/**
 * The allowed shop of an offer address (`www.x-kom.pl/p/…` → `x-kom.pl`), or `null` when the
 * address is not http(s) or its host is not one of the shops (or their subdomain).
 */
export function shopOf(url: string, shops: readonly string[] = DEFAULT_SHOPS): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const host = parsed.hostname.toLowerCase()
  return shops.find((shop) => host === shop || host.endsWith(`.${shop}`)) ?? null
}
