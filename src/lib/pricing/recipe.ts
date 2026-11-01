import { priceFromSnapshot, type PriceList } from './snapshot'
import type { Config } from './types'

/**
 * Price and margin of a build recipe in the panel's build editor (panel spec §9), live in the
 * browser. Client-safe: the same sum as the site's price (`priceFromSnapshot`) — a cost list
 * (`costList()` on the server, panel only) has the shape of a price list, so the cost of a
 * configuration is the same sum over costs.
 */
export type RecipeFigures = {
  price: number | null
  cost: number | null
  margin: number | null
}

export function recipeFigures(config: Config, prices: PriceList, costs: PriceList): RecipeFigures {
  const price = priceFromSnapshot(config, prices)
  const cost = priceFromSnapshot(config, costs)
  // An unknown cost (NaN: added after the batch) or price gives no margin — never a guess.
  const margin =
    price !== null && cost !== null && price > 0 && Number.isFinite(cost) ? 1 - cost / price : null
  return { price, cost: cost !== null && Number.isFinite(cost) ? cost : null, margin }
}
