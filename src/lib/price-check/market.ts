/**
 * Market cost and the decision per item (ADR-G007 §1–§2 pt 4, panel spec §11). Pure: the run
 * feeds readings in, the report and „Przyjmij propozycje” read the decisions.
 */

export type CostMethod = 'lowest' | 'avg2'

export type Offer = {
  price: number | null
  available: boolean
  matched: boolean
  /** When the page copy was taken (ISO); `null`/missing = unknown. */
  fetchedAt?: string | null
}

/** A page copy older than this does not make a proposal (the cheap fetch serves cached copies). */
export const STALE_DAYS = 7

const DAY_MS = 86_400_000

const cents = (v: number) => Math.round(v * 100) / 100

/** Offers of the same product, available now, with a price — cheapest first. */
const usable = (offers: readonly Offer[]) =>
  offers
    .filter((o) => o.matched && o.available && o.price !== null && o.price > 0)
    .sort((a, b) => a.price! - b.price!)

/**
 * Cost on the market = the lowest price of an offer that is the same product and available now,
 * or the average of the two lowest (`avg2`; one offer = that offer). `null` = no usable offer.
 */
export function marketCost(offers: readonly Offer[], method: CostMethod): number | null {
  const prices = usable(offers).map((o) => o.price!)
  if (prices.length === 0) return null
  if (method === 'lowest' || prices.length === 1) return cents(prices[0]!)
  return cents((prices[0]! + prices[1]!) / 2)
}

/**
 * Whether the market cost rests on an old page copy: an offer it is taken from (the lowest, or
 * the two lowest for `avg2`) was copied more than `STALE_DAYS` ago, or its date is unknown.
 */
export function staleCost(offers: readonly Offer[], method: CostMethod, now: Date): boolean {
  const used = usable(offers).slice(0, method === 'avg2' ? 2 : 1)
  return used.some((o) => {
    const at = o.fetchedAt ? Date.parse(o.fetchedAt) : Number.NaN
    return !Number.isFinite(at) || now.getTime() - at > STALE_DAYS * DAY_MS
  })
}

/**
 * A link found by the search switches itself on only when its reading is the same product with a
 * price within `outlierPct` of the current cost — a deterministic check, not the model's word
 * alone (a shop page could talk the model into „matches”). Otherwise it waits for Krystian.
 */
export function autoEnable(
  offer: { matched: boolean; price: number | null },
  cost: number,
  outlierPct: number,
): boolean {
  if (!offer.matched || offer.price === null || !(cost > 0)) return false
  return Math.abs(offer.price / cost - 1) <= outlierPct
}

export type Decision =
  /** A new cost to accept (only `market` items). */
  | { kind: 'propose'; newCost: number; change: number }
  /** The same cost (within a grosz). */
  | { kind: 'same' }
  /** Change above `outlierPct`, or an old page copy (`stale`): to check by hand, no proposal. */
  | { kind: 'manual'; market: number; change: number; stale?: true }
  /** Cost from an invoice: never overwritten, only the difference to the market is shown. */
  | { kind: 'invoice'; market: number; change: number }
  /** Offers read, none usable (not in stock, another product): the previous cost stays. */
  | { kind: 'unavailable' }
  /** No offer to read at all (no links, nothing found): the previous cost stays, no alarm. */
  | { kind: 'nooffer' }

export function decide(
  item: { cost: number; costSource: 'market' | 'invoice' },
  market: number | null,
  outlierPct: number,
  /** How many offers were read for the item (0 = nothing to read). */
  offersRead = 1,
  /** The market cost rests on an old page copy (`staleCost`). */
  stale = false,
): Decision {
  if (market === null) return offersRead === 0 ? { kind: 'nooffer' } : { kind: 'unavailable' }
  const change = item.cost > 0 ? (market - item.cost) / item.cost : Number.POSITIVE_INFINITY
  if (item.costSource === 'invoice') return { kind: 'invoice', market, change }
  if (Math.abs(market - item.cost) < 0.01) return { kind: 'same' }
  if (stale) return { kind: 'manual', market, change, stale: true }
  if (!(Math.abs(change) <= outlierPct)) return { kind: 'manual', market, change }
  return { kind: 'propose', newCost: market, change }
}
