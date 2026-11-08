/**
 * Prices from the published snapshot (ADR-G002 §3) — the only prices the site, configurator,
 * comparison, build page and `submitInquiry()` use. Browser-safe: it knows sell prices only, never
 * costs. A configuration's price is a plain sum of its items' published prices (no second
 * rounding), so the same choice has the same price everywhere.
 */
import type { Config } from './types'

/** Sell prices of every item, by code. Same shape for a published batch and for candidates. */
export type PriceList = {
  level: Record<string, number>
  option: Record<string, number>
  service: number
}

/** One published batch: prices + the per-level "price from" + when it was published. */
export type PriceSnapshot = PriceList & {
  batch: number
  /** ISO date-time; the site shows it as "Cena z dnia …" (ADR-G002 §2). */
  publishedAt: string
  levelFrom: Record<string, number>
}

/**
 * Round up to a multiple of `step`. The value is first rounded to 6 decimal places, so binary
 * floating-point noise (e.g. 0.1 * 3 * 100 = 30.000000000000004) never adds a whole step.
 * The one rounding implementation in the codebase (`ceil10` and the cost layer use it).
 */
export function ceilTo(value: number, step: number): number {
  if (!(step > 0)) throw new Error(`Rounding step must be positive, got ${step}.`)
  const clean = Math.round(value * 1e6) / 1e6
  return Math.ceil(clean / step) * step
}

/** `ceil10` of ADR-G002 §3. */
export function ceil10(value: number): number {
  return ceilTo(value, 10)
}

/**
 * Price of one code, or `undefined`. Codes come from URLs and forms, so only own keys count:
 * `prices['constructor']` must not return `Object.prototype.constructor`.
 */
export function lookupPrice(list: Record<string, number>, code: string): number | undefined {
  return Object.hasOwn(list, code) ? list[code] : undefined
}

/**
 * Price of a configuration = level + case + cooler + RAM + SSD + service. `null` when any code
 * has no price in the list (unknown or unpublished item) — the caller must reject it.
 */
export function priceFromSnapshot(config: Config, prices: PriceList): number | null {
  const items = [
    lookupPrice(prices.level, config.level),
    lookupPrice(prices.option, config.case),
    lookupPrice(prices.option, config.cooler),
    lookupPrice(prices.option, config.ram),
    lookupPrice(prices.option, config.ssd),
  ]
  let sum = prices.service
  for (const price of items) {
    if (price === undefined) return null
    sum += price
  }
  return sum
}

/**
 * Surcharge for swapping one option for another (UI: "+1 280 zł"). Because the price is a plain
 * sum, it does not depend on the rest of the configuration. `null` for an unknown code.
 */
export function surcharge(prices: PriceList, fromCode: string, toCode: string): number | null {
  const from = lookupPrice(prices.option, fromCode)
  const to = lookupPrice(prices.option, toCode)
  if (from === undefined || to === undefined) return null
  return to - from
}

/** A `published-prices` row as the site may read it (no cost fields). */
export type PublishedPriceRow = {
  batch: number
  itemType: 'level' | 'option' | 'service' | 'level_from'
  itemCode: string
  sellPrice: number
  publishedAt: string
}

/** Build a snapshot from the rows of one batch. Throws on mixed batches or a missing service. */
export function snapshotFromRows(rows: readonly PublishedPriceRow[]): PriceSnapshot {
  const first = rows[0]
  if (!first) throw new Error('No published prices.')
  const snapshot: PriceSnapshot = {
    batch: first.batch,
    publishedAt: first.publishedAt,
    level: {},
    option: {},
    service: Number.NaN,
    levelFrom: {},
  }
  for (const row of rows) {
    if (row.batch !== first.batch) {
      throw new Error(`Mixed price batches: ${first.batch} and ${row.batch}.`)
    }
    switch (row.itemType) {
      case 'level':
        snapshot.level[row.itemCode] = row.sellPrice
        break
      case 'option':
        snapshot.option[row.itemCode] = row.sellPrice
        break
      case 'service':
        snapshot.service = row.sellPrice
        break
      case 'level_from':
        snapshot.levelFrom[row.itemCode] = row.sellPrice
        break
    }
  }
  if (Number.isNaN(snapshot.service)) {
    throw new Error(`Price batch ${first.batch} has no service price.`)
  }
  return snapshot
}
