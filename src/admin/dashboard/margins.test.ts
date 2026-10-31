import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { firstBatch, firstBatchPublishedAt } from '../../seed/offer'
import type { Catalog } from '../../lib/pricing/catalog'
import {
  buildQueue,
  buildsOverview,
  planPublication,
  pricesAfterQueue,
} from '../../lib/pricing/publish'
import { snapshotFromRows } from '../../lib/pricing/snapshot'
import { seedCatalog } from '../../lib/pricing/testing/seedCatalog'
import { catalogAtPublish, marginsView } from './margins'

// Pulpit margins must be the numbers of lib/pricing (panel spec §18 pt 5): batch 1 and a
// sample cost change.
const catalog = seedCatalog()
const rows = firstBatch()
const snapshot = snapshotFromRows(
  rows.map((row) => ({ ...row, batch: 1, publishedAt: firstBatchPublishedAt() })),
)
const builds = expected.builds.map((b) => ({
  slug: b.slug,
  name: b.name,
  config: b.config,
  sigil: b.slug,
  tier: 'Moc',
}))
const plain = builds.map(({ slug, name, config }) => ({ slug, name, config }))
const WARN = 0.12

function withLevelCost(code: string, delta: number): Catalog {
  return {
    ...catalog,
    levels: catalog.levels.map((l) =>
      l.code === code ? { ...l, partsCost: l.partsCost + delta } : l,
    ),
  }
}

const bySlug = (view: ReturnType<typeof marginsView>, slug: string) =>
  view.builds.find((b) => b.slug === slug)!

describe('marginsView — batch 1, costs unchanged', () => {
  const queue = buildQueue(catalog, snapshot)
  const view = marginsView(builds, catalog, queue, rows, WARN)

  it('modes: batch and today; no "after" with an empty queue', () => {
    expect(view.modes).toEqual(['batch', 'today'])
    expect(view.queueCount).toBe(0)
  })

  it('today = fixtures (price and margin of every build), batch the same', () => {
    for (const b of expected.builds) {
      const row = bySlug(view, b.slug)
      expect(row.modes.today!.price, b.slug).toBe(b.price)
      expect(row.modes.today!.margin!).toBeCloseTo(b.margin, 6)
      expect(row.modes.batch!.margin!).toBeCloseTo(b.margin, 6)
    }
  })

  it('sorted by today’s margin, lowest first', () => {
    const margins = view.builds.map((b) => b.modes.today!.margin!)
    expect(margins).toEqual([...margins].sort((a, b) => a - b))
  })

  it('lowest in the configurator = the full review (11,092%)', () => {
    expect(view.lowest.today!).toBeCloseTo(expected.exhaustive.minMargin, 5)
    expect(view.lowest.batch!).toBeCloseTo(expected.exhaustive.minMargin, 5)
  })

  it('average = mean of the 16 build margins', () => {
    const mean = expected.builds.reduce((s, b) => s + b.margin, 0) / expected.builds.length
    expect(view.average.today!).toBeCloseTo(mean, 6)
  })
})

describe('marginsView — Wampir level +1000 zł today', () => {
  const changed = withLevelCost('P13', 1000)
  const queue = buildQueue(changed, snapshot)
  const view = marginsView(builds, changed, queue, rows, WARN)

  it('queue not empty → "after" exists', () => {
    expect(view.modes).toEqual(['batch', 'today', 'after'])
    expect(view.queueCount).toBe(queue.items.length)
  })

  it('today = buildsOverview with today’s costs; batch keeps the publication costs', () => {
    const today = buildsOverview(plain, changed, snapshot, null)
    const before = buildsOverview(plain, catalog, snapshot, null)
    for (const [i, b] of plain.entries()) {
      expect(bySlug(view, b.slug).modes.today!.margin).toBeCloseTo(today[i]!.margin!, 9)
      expect(bySlug(view, b.slug).modes.batch!.margin).toBeCloseTo(before[i]!.margin!, 9)
    }
    expect(bySlug(view, 'wampir').modes.today!.margin!).toBeLessThan(
      bySlug(view, 'wampir').modes.batch!.margin!,
    )
  })

  it('after = what publishing the whole queue would put on the site (planPublication)', () => {
    const plan = planPublication(
      changed,
      snapshot,
      queue.items.map((i) => i.key),
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const approved = snapshotFromRows(
      plan.rows.map((r) => ({ ...r, batch: 2, publishedAt: firstBatchPublishedAt() })),
    )
    const after = buildsOverview(plain, changed, approved, null)
    for (const [i, b] of plain.entries()) {
      expect(bySlug(view, b.slug).modes.after!.price, b.slug).toBe(after[i]!.price)
    }
    expect(view.lowest.today).toBeCloseTo(queue.publishedReview.minMargin!.margin, 9)
    expect(view.lowest.after).toBeCloseTo(plan.review.minMargin!.margin, 9)
    expect(view.lowest.today!).toBeLessThan(catalog.settings.minMargin)
    expect(view.lowest.after!).toBeGreaterThanOrEqual(catalog.settings.minMargin)
  })
})

describe('marginsView — a minor change outside the queue keeps its published price', () => {
  // P13 +1000 queues P13; P11 +1% is a minor change (under the threshold): not published.
  const p11 = catalog.levels.find((l) => l.code === 'P11')!
  const base = withLevelCost('P13', 1000)
  const changed: Catalog = {
    ...base,
    levels: base.levels.map((l) =>
      l.code === 'P11' ? { ...l, partsCost: l.partsCost + Math.round(p11.partsCost * 0.01) } : l,
    ),
  }
  const queue = buildQueue(changed, snapshot)
  const view = marginsView(builds, changed, queue, rows, WARN)

  it('the queue has P13 only; P11 is counted as minor', () => {
    expect(queue.items.map((i) => i.key)).toEqual(['level:P13'])
    expect(queue.minorChanges).toBe(1)
    expect(pricesAfterQueue(queue).level.P11).toBe(snapshot.level.P11)
    expect(queue.candidates.level.P11).not.toBe(snapshot.level.P11)
  })

  it('builds on P11 keep today’s price after approval', () => {
    const onP11 = expected.builds.filter((b) => b.config.level === 'P11')
    expect(onP11.length).toBeGreaterThan(0)
    for (const b of onP11) {
      const row = bySlug(view, b.slug)
      expect(row.modes.after!.price, b.slug).toBe(row.modes.today!.price)
    }
  })
})

describe('costs at publish', () => {
  it('replace today’s costs item by item', () => {
    const at = catalogAtPublish(withLevelCost('P13', 1000), rows)
    expect(at.levels.find((l) => l.code === 'P13')!.partsCost).toBe(
      catalog.levels.find((l) => l.code === 'P13')!.partsCost,
    )
  })

  it('an item without a recorded cost makes its builds and the minimum unknown, not guessed', () => {
    const wampir = expected.builds.find((b) => b.slug === 'wampir')!
    const partial = rows.filter(
      (r) => !(r.itemType === 'option' && r.itemCode === wampir.config.case),
    )
    const view = marginsView(builds, catalog, buildQueue(catalog, snapshot), partial, WARN)
    expect(bySlug(view, 'wampir').modes.batch!.margin).toBeNull()
    expect(bySlug(view, 'wampir').modes.today!.margin).not.toBeNull()
    expect(view.lowest.batch).toBeNull()
  })

  it('no costs at all → no batch mode', () => {
    const none = rows.map((r) => ({ ...r, costAtPublish: null }))
    const view = marginsView(builds, catalog, buildQueue(catalog, snapshot), none, WARN)
    expect(view.modes).toEqual(['today'])
    expect(view.average.batch).toBeUndefined()
  })
})
