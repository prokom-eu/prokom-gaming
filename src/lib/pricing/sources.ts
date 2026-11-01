/**
 * Shops whose offer pages may be linked as cost sources (ADR-G007 §5) — the start list of
 * `price-check-settings`. No marketplaces (Ceneo, Allegro): they mix in third-party offers, and
 * Ceneo's product page loads its offers in the browser only (empty for the fetch tool, 1.11.2026).
 */
export const DEFAULT_SHOPS = ['x-kom.pl', 'morele.net', 'komputronik.pl', 'sferis.pl'] as const

/**
 * The allowed shop of an offer address (`www.x-kom.pl/p/…` → `x-kom.pl`), or `null` when the
 * address is not plain https or its host is not one of the shops (or their subdomain).
 */
export function shopOf(url: string, shops: readonly string[] = DEFAULT_SHOPS): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  // The server reads these pages (P7): https only, default port, no credentials in the address.
  if (parsed.protocol !== 'https:' || parsed.port !== '') return null
  if (parsed.username || parsed.password) return null
  const host = parsed.hostname.toLowerCase()
  return shops.find((shop) => host === shop || host.endsWith(`.${shop}`)) ?? null
}

/**
 * New offer links from a search: allowed shops only, at most one per shop, none already known
 * (any link in `price-sources`, switched on or off). Keeps the search order.
 */
export function onePerShop(
  urls: readonly string[],
  known: ReadonlySet<string>,
  shops: readonly string[],
): string[] {
  const seen = new Set<string>()
  return urls.filter((url) => {
    const shop = shopOf(url, shops)
    if (shop === null || known.has(url) || seen.has(shop)) return false
    seen.add(shop)
    return true
  })
}
