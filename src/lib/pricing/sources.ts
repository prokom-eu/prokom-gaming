/**
 * Trusted shops (ADR-G007 §5, ADR-G011) — the start list of `price-check-settings`: their own
 * offer pages may be linked, and only their offers count on a Ceneo page. No marketplaces
 * (Allegro, Amazon): they mix in third-party sellers.
 */
export const DEFAULT_SHOPS = ['x-kom.pl', 'morele.net', 'komputronik.pl', 'sferis.pl'] as const

/** Never a trusted shop: Ceneo is read on its own, marketplaces mix in other sellers (ADR-G011). */
export const NOT_SHOPS = ['ceneo.pl', 'allegro.pl', 'amazon.pl', 'amazon.com', 'amazon.de'] as const

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

/** The price comparison site read for the trusted shops' offers (ADR-G011). */
export const CENEO = 'ceneo.pl'

/**
 * The product number of a Ceneo product page (`https://www.ceneo.pl/157489814`, also with
 * `#…` or `;…` after it), or `null` for any other address — a search, a category, a redirect.
 */
export function ceneoProductId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' || parsed.port !== '' || parsed.username || parsed.password) {
    return null
  }
  const host = parsed.hostname.toLowerCase()
  if (host !== CENEO && host !== `www.${CENEO}`) return null
  if (parsed.search !== '') return null
  return /^\/(\d{4,12})(?:;[^/]*)?$/.exec(parsed.pathname)?.[1] ?? null
}

/** The one address kept for a Ceneo product page. */
export const ceneoUrl = (id: string) => `https://www.${CENEO}/${id}`

/** The shop of a cost source: `ceneo.pl` for a Ceneo product page, else a trusted shop or `null`. */
export function sourceShop(url: string, shops: readonly string[] = DEFAULT_SHOPS): string | null {
  return ceneoProductId(url) !== null ? CENEO : shopOf(url, shops)
}
