import { ceneoProductId, shopOf } from '../pricing/sources'

/**
 * Ceneo product pages (ADR-G011): one page lists the offers of many shops with price and shipping
 * time. The server reads the public page itself — no Claude, no cost — and keeps only the trusted
 * shops' offers. Only what Ceneo shows on the page („wybrane oferty”); the rest Ceneo loads in the
 * browser and is not read. Parsing is pure and tested on the page's real markup.
 */

export type CeneoOffer = { shop: string; price: number; shipping: string | null }
export type CeneoPage = { title: string | null; offers: CeneoOffer[] }

/** A trusted shop's best offer on the page: the cheapest available one, else its cheapest. */
export type TrustedOffer = { shop: string; price: number; available: boolean }

/** At most this much of a page is parsed (a product page is ~0.5 MB). */
const MAX_HTML = 3_000_000

const ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
}

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code: string) => {
    if (code[0] === '#') {
      const n = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
      return Number.isFinite(n) ? String.fromCodePoint(n) : all
    }
    return ENTITIES[code.toLowerCase()] ?? all
  })
}

const plain = (html: string) =>
  decode(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

/** Title, and every offer with a shop, a price and the shipping line, as on the page. */
export function parseCeneo(html: string): CeneoPage {
  const source = html.slice(0, MAX_HTML)
  const rawTitle = /<title>([^<]*)<\/title>/i.exec(source)?.[1]
  // „GOODRAM IRDM 32GB … (IR6000D564L30S32GDC) - Opinie i ceny na Ceneo.pl”, sometimes with the
  // category between („… - Karta graficzna - Opinie i ceny na Ceneo.pl”).
  const title = rawTitle
    ? decode(rawTitle)
        .replace(/\s+-\s+(?:[^-]+?\s+-\s+)?(?:Opinie i ceny|Ceny i opinie) na Ceneo\.pl\s*$/i, '')
        .trim() || null
    : null
  const offers: CeneoOffer[] = []
  // One element per offer (a shop with two offers has two in one list item).
  const parts = source.split(/<div class="product-offer__container/).slice(1)
  for (const part of parts) {
    const head = part.slice(0, part.indexOf('>') + 1)
    const shop = /data-ShopUrl="([^"]+)"/i.exec(head)?.[1]
    const price = Number(/data-Price="([^"]+)"/i.exec(head)?.[1]?.replace(',', '.'))
    if (!shop || !Number.isFinite(price) || price <= 0) continue
    const ship = /class="shipmentday-container[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(part)?.[1]
    offers.push({
      shop: shop.toLowerCase().replace(/^www\./, ''),
      price: Math.round(price * 100) / 100,
      shipping: ship ? plain(ship) || null : null,
    })
  }
  return { title, offers }
}

const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']

/**
 * Days until shipping from Ceneo's line: „Wysyłka w 1 dzień” → 1, „Wysyłka do 3 dni” → 3,
 * „Wysyłka czw. 5 lis” → days to that date. `null` = not said.
 */
export function shippingDays(line: string | null, now: Date): number | null {
  if (!line) return null
  const text = line.toLowerCase()
  if (/24\s*h|dzisiaj|dziś/.test(text)) return 0
  if (/jutro/.test(text)) return 1
  const n = /(?:w|do)\s+(\d{1,2})\s+(?:dzień|dni)/.exec(text)
  if (n) return Number(n[1])
  const date = /(\d{1,2})\s+(sty|lut|mar|kwi|maj|cze|lip|sie|wrz|paź|lis|gru)/.exec(text)
  if (date) {
    // Today in Polish time (UTC is a day behind between 0:00 and 1–2:00).
    const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' })
      .format(now)
      .split('-')
      .map(Number)
    const today = Date.UTC(y!, m! - 1, d!)
    let at = Date.UTC(y!, MONTHS.indexOf(date[2]!), Number(date[1]))
    if (at < today - 86_400_000) at = Date.UTC(y! + 1, MONTHS.indexOf(date[2]!), Number(date[1]))
    return Math.max(0, Math.round((at - today) / 86_400_000))
  }
  return null
}

/**
 * Shipping within 3 working days (ADR-G007 §3 „available”). A date counts with the weekend
 * around it: up to 5 calendar days.
 */
function availableBy(line: string | null, now: Date): boolean {
  const days = shippingDays(line, now)
  if (days === null) return false
  return /\d{1,2}\s+(?:sty|lut|mar|kwi|maj|cze|lip|sie|wrz|paź|lis|gru)/i.test(line ?? '')
    ? days <= 5
    : days <= 3
}

/**
 * The trusted shops' offers of a page — one per shop: its cheapest available offer, else its
 * cheapest. Marketplaces and unknown shops are left out (they would push the cost down with
 * offers PRO-KOM does not buy from — ADR-G007 §1).
 */
export function trustedOffers(
  page: CeneoPage,
  shops: readonly string[],
  now: Date,
): TrustedOffer[] {
  const best = new Map<string, TrustedOffer>()
  for (const offer of page.offers) {
    const shop = shopOf(`https://${offer.shop}/`, shops)
    if (!shop) continue
    const candidate = { shop, price: offer.price, available: availableBy(offer.shipping, now) }
    const kept = best.get(shop)
    const better =
      !kept ||
      (candidate.available && !kept.available) ||
      (candidate.available === kept.available && candidate.price < kept.price)
    if (better) best.set(shop, candidate)
  }
  return [...best.values()].sort((a, b) => a.price - b.price)
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
const compact = (s: string) => norm(s).replace(/[^\p{L}\d]/gu, '')
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Units a model mark may be glued to in a title („16G” → „16GB”, „750” → „750W”). */
const UNIT = '(?:b|gb|tb|mb|mhz|hz|mm|w)?'
const words = (s: string) =>
  new Set(
    norm(s)
      .split(/[^\p{L}\d]+/u)
      .filter(Boolean),
  )

/** Words that make another variant of the same model: each must be in both names or in neither. */
const VARIANTS: readonly (readonly string[])[] = [
  ['ti'],
  ['xt'],
  ['xtx'],
  ['super'],
  ['pro'],
  ['plus'],
  ['lite'],
  ['max'],
  ['argb', 'a-rgb'],
  ['wifi', 'wifi6e', 'wifi7'],
  ['white', 'biała', 'biały', 'biala', 'bialy', 'białe', 'biale'],
  ['tray', 'oem'],
  ['box'],
]

/**
 * Is the Ceneo page the item's product? Every model mark of the item (a word with a digit:
 * 9800X3D, 16G, 6000, a code in brackets) must be in the page title as a whole word — only a unit
 * may follow it, so „14400” is not „14400F” and „7900XT” is not „7900XTX” — and variant words
 * (Ti, XT, white, Tray…) must agree. Deterministic — the page cannot talk anything into „matches”; a page
 * that fails waits for Krystian as a proposal, it is never read.
 */
export function titleMatches(model: string, title: string | null): boolean {
  if (!title) return false
  const outside = model.replace(/\([^)]*\)/g, ' ')
  const codes = [...model.matchAll(/\(([^)]*)\)/g)]
    .flatMap((m) => m[1]!.split(/\s+/))
    .filter((w) => w.length >= 6 && /\d/.test(w) && /\p{L}/u.test(w))
  const marks = [...outside.split(/\s+/).filter((w) => /\d/.test(w)), ...codes]
    .map(compact)
    .filter(Boolean)
  // Separators become spaces; a mark may be split by them in the title („WIFI 7”, „CC-901…”).
  const spaced = ` ${norm(title).replace(/[^\p{L}\d]+/gu, ' ')} `
  const found = (mark: string) =>
    new RegExp(
      `(?<![\\p{L}\\d])${mark.split('').map(escapeRe).join(' ?')}${UNIT}(?![\\p{L}\\d])`,
      'u',
    ).test(spaced)
  if (!marks.every(found)) return false
  const modelWords = words(model.replace(/a-rgb/gi, 'argb'))
  const titleWords = words(title.replace(/a-rgb/gi, 'argb'))
  return VARIANTS.every((group) => {
    const inModel = group.some((w) => modelWords.has(norm(w)))
    const inTitle = group.some((w) => titleWords.has(norm(w)))
    return inModel === inTitle
  })
}

/**
 * The page as Ceneo serves it to anyone, `null` when it is not there — or when Ceneo sends the
 * address elsewhere (a product moved to another number or to a category: those offers are not
 * this item's). An honest name in the request (robots.txt allows product pages, ADR-G011); the
 * run waits between pages.
 */
export async function fetchCeneoPage(url: string, siteUrl: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': `PRO-KOM-Gaming-PriceCheck/1.0 (+${siteUrl})`,
        'Accept-Language': 'pl-PL,pl;q=0.9',
        Accept: 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok || ceneoProductId(response.url) !== ceneoProductId(url)) return null
    if (!(response.headers.get('content-type') ?? '').includes('text/html')) return null
    return (await response.text()).slice(0, MAX_HTML)
  } catch {
    return null
  }
}
