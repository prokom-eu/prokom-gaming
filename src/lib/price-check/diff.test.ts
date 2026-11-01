import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { firstBatch, firstBatchPublishedAt, seed } from '../../seed/offer'
import { partKey } from '../pricing/partKey'
import { buildQueue, buildsOverview, pricesAfterQueue } from '../pricing/publish'
import type { Catalog } from '../pricing/catalog'
import { snapshotFromRows } from '../pricing/snapshot'
import { seedCatalog } from '../pricing/testing/seedCatalog'
import { computeDiff, type CheckItem } from './diff'
import { decide } from './market'

// The report's numbers must be lib/pricing's (panel spec §18 pt 5): RAM 8% dearer on the market.
const catalog = seedCatalog()
const snapshot = snapshotFromRows(
  firstBatch().map((row) => ({ ...row, batch: 1, publishedAt: firstBatchPublishedAt() })),
)
const builds = expected.builds.map(({ slug, name, config }) => ({ slug, name, config }))
const levelParts = new Map(
  seed.levels.map((l) => [
    l.code,
    l.components.map((c) => ({ partKey: partKey(c.role, c.internalModel), cost: c.cost })),
  ]),
)

const ramItems = catalog.options
  .filter((o) => o.type === 'ram')
  .map((o) => {
    const item: CheckItem = {
      itemType: 'option',
      code: o.code,
      title: o.code,
      model: o.code,
      category: 'ram',
      costSource: 'market',
      cost: o.cost,
      costAtBatch: o.cost,
      builds: [],
      levels: [],
    }
    const market = Math.round(o.cost * 1.08 * 100) / 100
    return { ...item, market, decision: decide(item, market, 0.25), offers: [] }
  })

const ramCatalog: Catalog = {
  ...catalog,
  options: catalog.options.map((o) =>
    o.type === 'ram' ? { ...o, cost: Math.round(o.cost * 1.08 * 100) / 100 } : o,
  ),
}

describe('computeDiff (the report)', () => {
  const diff = computeDiff({
    catalog,
    snapshot,
    builds,
    levelParts,
    batchCatalog: catalog,
    items: ramItems,
  })

  it('proposes the 7 RAM costs and nothing else', () => {
    expect(diff.totals.proposals).toBe(7)
    expect(diff.totals.unavailable).toBe(0)
  })

  it('the lowest margin at the prices on the site = buildQueue with the new costs', () => {
    const queue = buildQueue(ramCatalog, snapshot)
    expect(diff.totals.lowestNow).toBeCloseTo(queue.publishedReview.minMargin!.margin, 10)
  })

  it('builds: price now, price after the queue and margins = buildsOverview', () => {
    const queue = buildQueue(ramCatalog, snapshot)
    const after = buildsOverview(builds, ramCatalog, pricesAfterQueue(queue), snapshot)
    const now = buildsOverview(builds, ramCatalog, snapshot, null)
    diff.builds.forEach((row, i) => {
      expect(row.priceNow).toBe(now[i]!.price)
      expect(row.marginNow).toBeCloseTo(now[i]!.margin!, 10)
      expect(row.priceNew).toBe(after[i]!.price)
      expect(row.change).toBe(after[i]!.change)
    })
  })

  it('a part proposal changes every level that has the part', () => {
    const level = seed.levels.find((l) => l.code === 'P10')!
    const gpu = level.components.find((c) => c.role === 'gpu')!
    const key = partKey('gpu', gpu.internalModel)
    const item: CheckItem = {
      itemType: 'component',
      code: key,
      title: gpu.publicLabel,
      model: gpu.internalModel,
      category: 'gpu',
      costSource: 'market',
      cost: gpu.cost,
      costAtBatch: null,
      builds: [],
      levels: seed.levels
        .filter((l) => l.components.some((c) => partKey(c.role, c.internalModel) === key))
        .map((l) => l.code),
    }
    const market = gpu.cost + 300
    const partDiff = computeDiff({
      catalog,
      snapshot,
      builds,
      levelParts,
      batchCatalog: catalog,
      items: [{ ...item, market, decision: decide(item, market, 0.25), offers: [] }],
    })
    const base = buildsOverview(builds, catalog, snapshot, null).find(
      (b) => b.slug === 'bazyliszek',
    )!
    const bazyliszek = partDiff.builds.find((b) => b.slug === 'bazyliszek')!
    // P10 (Bazyliszek) has this GPU: +300 zł of cost, the price on the site is unchanged.
    expect(bazyliszek.costNew).toBeCloseTo(base.cost! + 300, 6)
    expect(bazyliszek.priceNow).toBe(base.price)
    expect(partDiff.items[0]!.levels).toContain('P10')
  })
})
