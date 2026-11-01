/**
 * Market cost and the decision per item (ADR-G007 §1–§2 pt 4, panel spec §11). Pure: the run
 * feeds readings in, the report and „Przyjmij propozycje” read the decisions.
 */

export type CostMethod = 'lowest' | 'avg2'

export type Offer = { price: number | null; available: boolean; matched: boolean }

const cents = (v: number) => Math.round(v * 100) / 100

/**
 * Cost on the market = the lowest price of an offer that is the same product and available now,
 * or the average of the two lowest (`avg2`; one offer = that offer). `null` = no usable offer.
 */
export function marketCost(offers: readonly Offer[], method: CostMethod): number | null {
  const prices = offers
    .filter((o) => o.matched && o.available && o.price !== null && o.price > 0)
    .map((o) => o.price!)
    .sort((a, b) => a - b)
  if (prices.length === 0) return null
  if (method === 'lowest' || prices.length === 1) return cents(prices[0]!)
  return cents((prices[0]! + prices[1]!) / 2)
}

export type Decision =
  /** A new cost to accept (only `market` items). */
  | { kind: 'propose'; newCost: number; change: number }
  /** The same cost (within a grosz). */
  | { kind: 'same' }
  /** Change above `outlierPct`: to check by hand, no proposal. */
  | { kind: 'manual'; market: number; change: number }
  /** Cost from an invoice: never overwritten, only the difference to the market is shown. */
  | { kind: 'invoice'; market: number; change: number }
  /** No usable offer: the previous cost stays. */
  | { kind: 'unavailable' }

export function decide(
  item: { cost: number; costSource: 'market' | 'invoice' },
  market: number | null,
  outlierPct: number,
): Decision {
  if (market === null) return { kind: 'unavailable' }
  const change = item.cost > 0 ? (market - item.cost) / item.cost : Number.POSITIVE_INFINITY
  if (item.costSource === 'invoice') return { kind: 'invoice', market, change }
  if (Math.abs(market - item.cost) < 0.01) return { kind: 'same' }
  if (!(Math.abs(change) <= outlierPct)) return { kind: 'manual', market, change }
  return { kind: 'propose', newCost: market, change }
}
