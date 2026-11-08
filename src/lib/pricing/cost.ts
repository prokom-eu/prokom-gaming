import 'server-only'

import {
  checkCompat,
  indexOffer,
  resolveParts,
  type CompatError,
  type CompatResult,
  type OfferIndex,
} from '../compat'
import type { Catalog, CostLevel, CostOption, PricingSettingsInput } from './catalog'
import { ceilTo, lookupPrice, priceFromSnapshot, type PriceList } from './snapshot'
import type { Config } from './types'

/**
 * Prices from costs (ADR-G002 §3) — the panel's price publication and the margin guard use it,
 * never the site. Server-only: costs and markups must not reach the browser bundle (§8.8).
 */

/** Markup floor: the lowest markup that still gives `minMargin` (0.11 → 0.123596). */
export function markupFloor(s: PricingSettingsInput): number {
  return s.minMargin / (1 - s.minMargin)
}

function eff(markup: number, s: PricingSettingsInput): number {
  return Math.max(markup, markupFloor(s))
}

export function levelMarkup(level: CostLevel, s: PricingSettingsInput): number {
  return level.markupOverride ?? s.levelMarkupByClass[level.markupClass]
}

export function sellLevel(level: CostLevel, s: PricingSettingsInput): number {
  const white = level.color === 'biały' ? s.whiteSurcharge : 0
  return ceilTo(level.partsCost * (1 + eff(levelMarkup(level, s), s)) + white, s.roundingStep)
}

/**
 * Cases and coolers: market price + buffer, no floor (they are shown with full names and must
 * look fair next to Ceneo). RAM and SSD: category markup, at least the floor.
 */
export function sellOption(option: CostOption, s: PricingSettingsInput): number {
  const markup = s.categoryMarkup[option.type]
  if (option.type === 'case' || option.type === 'cooler') {
    return ceilTo(option.cost * (1 + markup) + s.caseCoolerBuffer, s.roundingStep)
  }
  return ceilTo(option.cost * (1 + eff(markup, s)), s.roundingStep)
}

/** Assembly, Windows, shipping and packaging: 180 zł today. */
export function serviceSell(s: PricingSettingsInput): number {
  return ceilTo(s.serviceCost * (1 + eff(s.categoryMarkup.service, s)), s.roundingStep)
}

/** Sell prices of every level, option (active or not) and the service from current costs. */
export function sellPrices(catalog: Catalog): PriceList {
  const { settings } = catalog
  return {
    level: Object.fromEntries(catalog.levels.map((l) => [l.code, sellLevel(l, settings)])),
    option: Object.fromEntries(catalog.options.map((o) => [o.code, sellOption(o, settings)])),
    service: serviceSell(settings),
  }
}

/**
 * Costs in the shape of a price list (level = parts cost, option = cost, service = service
 * cost): a configuration's cost is then the same sum as its price (`configCost` in `recipe.ts`).
 * Panel only — it is every cost of the offer.
 */
export function costList(catalog: Catalog): PriceList {
  return {
    level: Object.fromEntries(catalog.levels.map((l) => [l.code, l.partsCost])),
    option: Object.fromEntries(catalog.options.map((o) => [o.code, o.cost])),
    service: catalog.settings.serviceCost,
  }
}

export function margin(price: number, cost: number): number {
  return 1 - cost / price
}

// --- One configuration ---

export type CostContext = {
  catalog: Catalog
  index: OfferIndex<CostLevel, CostOption>
  /** The prices being checked: current published ones or publication candidates. */
  prices: PriceList
}

export function costContext(
  catalog: Catalog,
  prices: PriceList = sellPrices(catalog),
): CostContext {
  return { catalog, index: indexOffer(catalog.levels, catalog.options), prices }
}

export type Evaluation = CompatResult & { price: number; cost: number; margin: number }

/**
 * Price, cost, margin and rule check of one configuration; `null` for an unknown code.
 * cost = parts + service cost; margin = 1 − cost / price.
 */
export function evaluate(config: Config, ctx: CostContext): Evaluation | null {
  const parts = resolveParts(config, ctx.index)
  const price = priceFromSnapshot(config, ctx.prices)
  if (!parts || price === null) return null
  const cost =
    parts.level.partsCost +
    parts.case.cost +
    parts.cooler.cost +
    parts.ram.cost +
    parts.ssd.cost +
    ctx.catalog.settings.serviceCost
  return { ...checkCompat(parts), price, cost, margin: margin(price, cost) }
}

// --- Full review of every configuration (the margin guard, ADR-G002 §4.3) ---

export type PricedConfig = Config & { price: number; cost: number; margin: number }

export type LevelBelowMin = {
  /** Compatible configurations of this level under `minMargin`. */
  count: number
  worst: PricedConfig
  /**
   * The lowest level price that lifts every configuration of the level to `minMargin`; `null`
   * when a cost or price is unusable (fix the data first).
   */
  minLevelPrice: number | null
}

export type Review = {
  /** All combinations of the level and active options (16 × 24 × 22 × 7 × 4 today). */
  total: number
  compatible: number
  /** Each broken rule counted separately (one configuration may count several times). */
  rejectedByReason: Partial<Record<CompatError, number>>
  /** Lowest margin among compatible configurations; `null` when none is compatible. */
  minMargin: PricedConfig | null
  /** "Price from" per level: cheapest compatible configuration (ADR-G002 §3). */
  priceFrom: Record<string, PricedConfig>
  /** Levels with configurations under `minMargin`. Empty = publication may go ahead. */
  belowMinMargin: Record<string, LevelBelowMin>
  durationMs: number
}

// Margins are compared with a tolerance far below the 0.0001 shown anywhere.
const EPSILON = 1e-9

/**
 * Check every combination of level × active case × cooler × RAM × SSD against the rules and the
 * margin floor, with the given prices (ADR-G002 §2: today 236 544 → 85 134 compatible).
 */
export function reviewAll(ctx: CostContext): Review {
  const started = performance.now()
  const { catalog, prices } = ctx
  const { minMargin, serviceCost, roundingStep } = catalog.settings
  const active = catalog.options.filter((o) => o.active)
  const byType = <T extends CostOption['type']>(type: T) =>
    active.filter((o): o is Extract<CostOption, { type: T }> => o.type === type)
  const cases = byType('case')
  const coolers = byType('cooler')
  const rams = byType('ram')
  const ssds = byType('ssd')

  const priceOf = (code: string, list: Record<string, number>): number => {
    const price = lookupPrice(list, code)
    if (price === undefined) throw new Error(`${code}: brak ceny do sprawdzenia.`)
    return price
  }

  const review: Review = {
    total: 0,
    compatible: 0,
    rejectedByReason: {},
    minMargin: null,
    priceFrom: {},
    belowMinMargin: {},
    durationMs: 0,
  }

  for (const level of catalog.levels) {
    const levelPrice = priceOf(level.code, prices.level)
    // Largest amount by which a configuration of this level misses the margin floor; NaN once
    // any configuration has no usable cost or price (then no level price can be suggested).
    let shortfall = 0
    for (const c of cases) {
      for (const cooler of coolers) {
        for (const ram of rams) {
          for (const ssd of ssds) {
            review.total++
            const { errors } = checkCompat({ level, case: c, cooler, ram, ssd })
            if (errors.length > 0) {
              for (const e of errors) {
                review.rejectedByReason[e] = (review.rejectedByReason[e] ?? 0) + 1
              }
              continue
            }
            review.compatible++
            const price =
              levelPrice +
              priceOf(c.code, prices.option) +
              priceOf(cooler.code, prices.option) +
              priceOf(ram.code, prices.option) +
              priceOf(ssd.code, prices.option) +
              prices.service
            const cost = level.partsCost + c.cost + cooler.cost + ram.cost + ssd.cost + serviceCost
            const m = margin(price, cost)
            const priced = (): PricedConfig => ({
              level: level.code,
              case: c.code,
              cooler: cooler.code,
              ram: ram.code,
              ssd: ssd.code,
              price,
              cost,
              margin: m,
            })

            if (!review.minMargin || m < review.minMargin.margin) review.minMargin = priced()
            const from = review.priceFrom[level.code]
            if (!from || price < from.price) review.priceFrom[level.code] = priced()

            // Written as "not at least the floor" so a NaN margin (missing cost, zero price) is
            // caught instead of passing every comparison.
            if (!(m >= minMargin - EPSILON)) {
              shortfall = Math.max(shortfall, cost / (1 - minMargin) - price)
              const below = review.belowMinMargin[level.code]
              if (!below) {
                review.belowMinMargin[level.code] = {
                  count: 1,
                  worst: priced(),
                  minLevelPrice: null,
                }
              } else {
                below.count++
                if (!(m >= below.worst.margin)) below.worst = priced()
              }
            }
          }
        }
      }
    }
    const below = review.belowMinMargin[level.code]
    if (below && Number.isFinite(shortfall)) {
      below.minLevelPrice = ceilTo(levelPrice + shortfall, roundingStep)
    }
  }

  review.durationMs = performance.now() - started
  return review
}
