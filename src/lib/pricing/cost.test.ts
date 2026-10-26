import { beforeAll, describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { firstBatch } from '../../seed/offer'
import type { Catalog } from './catalog'
import {
  costContext,
  evaluate,
  markupFloor,
  reviewAll,
  sellLevel,
  sellOption,
  sellPrices,
  serviceSell,
  type CostContext,
  type Review,
} from './cost'
import { ceil10, priceFromSnapshot } from './snapshot'
import { seedCatalog } from './testing/seedCatalog'

let catalog: Catalog
let ctx: CostContext
let review: Review

beforeAll(() => {
  catalog = seedCatalog()
  ctx = costContext(catalog)
  review = reviewAll(ctx)
})

describe('sell prices from costs (ADR-G002 §3)', () => {
  it('markup floor gives exactly the minimum margin', () => {
    expect(markupFloor(catalog.settings)).toBeCloseTo(0.123596, 6)
  })

  it('a markup under the floor is lifted to it (levels, RAM, SSD, service — not cases/coolers)', () => {
    // Today every markup is above the floor, so the seed data alone never exercises it.
    const low = {
      ...catalog.settings,
      levelMarkupByClass: { fullhd: 0.05, qhd: 0.05, uhd: 0.05, flagship: 0.05 },
      categoryMarkup: { case: 0, cooler: 0, ram: 0.05, ssd: 0.05, service: 0.05 },
    }
    const floor = markupFloor(low)
    const level = { ...catalog.levels.find((l) => l.code === 'P02')!, markupOverride: null }
    expect(sellLevel(level, low)).toBe(ceil10(level.partsCost * (1 + floor)))
    const ram = catalog.options.find((o) => o.code === 'R16')!
    expect(sellOption(ram, low)).toBe(ceil10(ram.cost * (1 + floor)))
    expect(serviceSell(low)).toBe(ceil10(low.serviceCost * (1 + floor)))
    const caseOpt = catalog.options.find((o) => o.type === 'case')!
    expect(sellOption(caseOpt, low)).toBe(ceil10(caseOpt.cost + low.caseCoolerBuffer))
  })

  it('white levels carry the white surcharge on top of the markup', () => {
    const white = catalog.levels.find((l) => l.color === 'biały')!
    const black = { ...white, color: 'czarny' as const }
    const diff = sellLevel(white, catalog.settings) - sellLevel(black, catalog.settings)
    expect(diff).toBeGreaterThanOrEqual(catalog.settings.whiteSurcharge - 10)
    expect(diff).toBeLessThanOrEqual(catalog.settings.whiteSurcharge + 10)
  })

  it('service = 180 zł', () => {
    expect(serviceSell(catalog.settings)).toBe(expected.serviceSell)
  })

  it('reproduces all 90 prices of the first batch (sheet → seed, G3)', () => {
    const prices = sellPrices(catalog)
    const computed = new Map<string, number>([
      ...Object.entries(prices.level).map(([code, p]) => [`level:${code}`, p] as const),
      ...Object.entries(prices.option).map(([code, p]) => [`option:${code}`, p] as const),
      ['service:SERVICE', prices.service],
      ...Object.entries(review.priceFrom).map(
        ([code, c]) => [`level_from:${code}`, c.price] as const,
      ),
    ])
    const batch = firstBatch()
    expect(batch).toHaveLength(90)
    for (const row of batch) {
      expect(computed.get(`${row.itemType}:${row.itemCode}`), row.itemCode).toBe(row.sellPrice)
    }
    expect(computed.size).toBe(batch.length)
  })
})

describe('16 builds (ADR-G002 §8.1)', () => {
  it.each(expected.builds)('$name = $price zł', (build) => {
    const result = evaluate(build.config, ctx)
    expect(result).not.toBeNull()
    expect(result!.price).toBe(build.price)
    expect(result!.cost).toBe(build.cost)
    expect(result!.margin).toBeCloseTo(build.margin, 6)
    expect(result!.errors).toEqual(build.errors)
  })

  it('a build costs the same as the same codes chosen in the configurator', () => {
    for (const build of expected.builds) {
      expect(priceFromSnapshot({ ...build.config }, ctx.prices)).toBe(build.price)
    }
  })
})

describe('sheet scenarios (ADR-G002 §8.4)', () => {
  it.each(expected.scenarios)('$name', (scenario) => {
    const result = evaluate(scenario.config, ctx)!
    expect(result.price).toBe(scenario.price)
    expect(result.margin).toBeCloseTo(scenario.margin, 4)
    expect(result.errors).toEqual(scenario.errors)
    expect(result.warnings).toEqual(scenario.warnings)
  })

  it('returns null for an unknown code', () => {
    expect(evaluate({ ...expected.builds[0]!.config, ssd: 'NOPE' }, ctx)).toBeNull()
  })
})

describe('full review of every configuration (ADR-G002 §8.2–§8.3)', () => {
  it('counts 236 544 combinations and 85 134 compatible ones', () => {
    expect(review.total).toBe(expected.exhaustive.total)
    expect(review.compatible).toBe(expected.exhaustive.compatible)
    expect(review.rejectedByReason).toEqual(expected.exhaustive.rejectedByReason)
  })

  it('lowest margin 11.092% for P01 + H9 + KRAKEN + R16D4 + PXL512 (6 410 zł)', () => {
    const { minMarginConfig, minMargin } = expected.exhaustive
    expect(review.minMargin).toMatchObject(minMarginConfig)
    expect(review.minMargin!.margin).toBeCloseTo(minMargin, 5)
  })

  it('no configuration is under the 11% floor today', () => {
    expect(review.belowMinMargin).toEqual({})
  })

  it('"price from" of all 16 levels', () => {
    const priceFrom = Object.fromEntries(
      Object.entries(review.priceFrom).map(([code, c]) => [code, c.price]),
    )
    expect(priceFrom).toEqual(expected.priceFrom)
  })

  it('runs fast enough for the panel', () => {
    // Measured locally in ms; the guard runs before every publication.
    console.info(`reviewAll: ${review.durationMs.toFixed(0)} ms for ${review.total} combinations`)
    expect(review.durationMs).toBeLessThan(5000)
  })
})

describe('additivity (ADR-G002 §8.5)', () => {
  // Deterministic pseudo-random sequence: a failure always reproduces.
  function lcg(seed: number) {
    let state = seed
    return () => {
      state = (state * 1664525 + 1013904223) % 2 ** 32
      return state / 2 ** 32
    }
  }

  it('changing one option changes the price by exactly the difference of option prices', () => {
    const random = lcg(20261025)
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
    const slots = ['case', 'cooler', 'ram', 'ssd'] as const
    for (let i = 0; i < 500; i++) {
      const config = {
        level: pick(catalog.levels).code,
        case: pick(catalog.options.filter((o) => o.type === 'case')).code,
        cooler: pick(catalog.options.filter((o) => o.type === 'cooler')).code,
        ram: pick(catalog.options.filter((o) => o.type === 'ram')).code,
        ssd: pick(catalog.options.filter((o) => o.type === 'ssd')).code,
      }
      const slot = pick(slots)
      const other = pick(catalog.options.filter((o) => o.type === slot)).code
      const a = evaluate(config, ctx)!
      const b = evaluate({ ...config, [slot]: other }, ctx)!
      expect(b.price - a.price).toBe(ctx.prices.option[other]! - ctx.prices.option[config[slot]]!)
    }
  })
})

describe('margin guard (ADR-G002 §4.3)', () => {
  it('finds levels under the floor and the level price that fixes them', () => {
    // A GPU gets 1 500 zł dearer, but the published P01 price stays — the guard must catch it.
    const dearer: Catalog = {
      ...catalog,
      levels: catalog.levels.map((l) =>
        l.code === 'P01' ? { ...l, partsCost: l.partsCost + 1500 } : l,
      ),
    }
    const stale = costContext(dearer, ctx.prices)
    const result = reviewAll(stale)
    expect(Object.keys(result.belowMinMargin)).toEqual(['P01'])
    const p01 = result.belowMinMargin.P01!
    expect(p01.count).toBeGreaterThan(0)
    expect(p01.worst.margin).toBeLessThan(catalog.settings.minMargin)
    expect(p01.minLevelPrice).toBeGreaterThan(ctx.prices.level.P01!)

    // Publishing P01 at the suggested price clears the guard.
    const fixed = costContext(dearer, {
      ...ctx.prices,
      level: { ...ctx.prices.level, P01: p01.minLevelPrice },
    })
    expect(reviewAll(fixed).belowMinMargin).toEqual({})
  })

  it('an inactive option is left out of the review', () => {
    const withoutH9: Catalog = {
      ...catalog,
      options: catalog.options.map((o) => (o.code === 'H9' ? { ...o, active: false } : o)),
    }
    const result = reviewAll(costContext(withoutH9, ctx.prices))
    expect(result.total).toBe(expected.exhaustive.total - 16 * 22 * 7 * 4)
    expect(result.minMargin!.case).not.toBe('H9')
  })
})
