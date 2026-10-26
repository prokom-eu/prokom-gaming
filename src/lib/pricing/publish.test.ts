import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { firstBatch, firstBatchPublishedAt } from '../../seed/offer'
import type { Catalog } from './catalog'
import { buildQueue, buildsOverview, itemKey, planPublication, problemMessage } from './publish'
import { snapshotFromRows, type PriceSnapshot } from './snapshot'
import { seedCatalog } from './testing/seedCatalog'

const catalog = seedCatalog()
const snapshot: PriceSnapshot = snapshotFromRows(
  firstBatch().map((row) => ({ ...row, batch: 1, publishedAt: firstBatchPublishedAt() })),
)

/** The seed catalog with one power level's parts cost changed. */
function withLevelCost(code: string, delta: number, base: Catalog = catalog): Catalog {
  return {
    ...base,
    levels: base.levels.map((l) =>
      l.code === code ? { ...l, partsCost: l.partsCost + delta } : l,
    ),
  }
}

function withOptionCost(code: string, delta: number, base: Catalog = catalog): Catalog {
  return {
    ...base,
    options: base.options.map((o) => (o.code === code ? { ...o, cost: o.cost + delta } : o)),
  }
}

describe('queue (ADR-G002 §4.2)', () => {
  it('fresh seed: nothing to approve, published prices hold the margin', () => {
    const queue = buildQueue(catalog, snapshot)
    expect(queue.items).toEqual([])
    expect(queue.minorChanges).toBe(0)
    expect(queue.publishedReview.belowMinMargin).toEqual({})
  })

  it('a cost change above the threshold queues the item with old and new price', () => {
    const queue = buildQueue(withLevelCost('P13', 1000), snapshot)
    expect(queue.items.map((i) => i.key)).toEqual(['level:P13'])
    const [item] = queue.items
    expect(item!.published).toBe(snapshot.level.P13)
    expect(item!.candidate).toBeGreaterThan(snapshot.level.P13!)
    expect(item!.change).toBeGreaterThan(catalog.settings.publishThreshold)
    expect(item!.reasons).toContain('threshold')
  })

  it('a small change stays off the queue and is only counted', () => {
    // ~1% of the parts cost of P11 (plenty of margin): under the 3% threshold, the price stays.
    const p11 = catalog.levels.find((l) => l.code === 'P11')!
    const queue = buildQueue(withLevelCost('P11', Math.round(p11.partsCost * 0.01)), snapshot)
    expect(queue.items).toEqual([])
    expect(queue.minorChanges).toBe(1)
  })

  it('a small change that still breaks the margin is urgent, not minor', () => {
    // P13 (Wampir) sits close to the floor: +100 zł of cost already breaks a configuration.
    const queue = buildQueue(withLevelCost('P13', 100), snapshot)
    expect(queue.items).toEqual([
      expect.objectContaining({ key: 'level:P13', reasons: ['urgent'] }),
    ])
    expect(queue.publishedReview.belowMinMargin.P13).toBeDefined()
  })

  it('a published price that breaks the margin at today’s cost is urgent', () => {
    // P01 parts cost +12%: the old price now gives a margin under 11%.
    const p01 = catalog.levels.find((l) => l.code === 'P01')!
    const queue = buildQueue(withLevelCost('P01', p01.partsCost * 0.12), snapshot)
    const item = queue.items.find((i) => i.key === 'level:P01')!
    expect(item.reasons).toEqual(expect.arrayContaining(['threshold', 'urgent']))
    expect(queue.items[0]!.key).toBe('level:P01') // urgent first
    expect(queue.publishedReview.belowMinMargin.P01).toBeDefined()
  })

  it('an item that was never published is queued as new', () => {
    const extra: Catalog = {
      ...catalog,
      options: [
        ...catalog.options,
        { ...catalog.options.find((o) => o.code === 'R16')!, code: 'R16NEW' },
      ],
    }
    const queue = buildQueue(extra, snapshot)
    expect(queue.items).toEqual([
      expect.objectContaining({ key: 'option:R16NEW', published: null, reasons: ['new'] }),
    ])
  })
})

describe('publication with the margin guard (ADR-G002 §4.3)', () => {
  it('publishes the approved item: new batch with every item and the new "price from"', () => {
    const dearer = withLevelCost('P13', 1000)
    const queue = buildQueue(dearer, snapshot)
    const plan = planPublication(dearer, snapshot, [itemKey('level', 'P13')])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return

    // 16 levels + 57 options + service + 16 "price from" = 90 rows, like the first batch.
    expect(plan.rows).toHaveLength(90)
    const p13 = plan.rows.find((r) => r.itemType === 'level' && r.itemCode === 'P13')!
    expect(p13.sellPrice).toBe(queue.items[0]!.candidate)
    expect(p13.costAtPublish).toBe(dearer.levels.find((l) => l.code === 'P13')!.partsCost)

    // History only for what changed: P13 and its "price from".
    expect(plan.changes.map((r) => `${r.itemType}:${r.itemCode}`).sort()).toEqual([
      'level:P13',
      'level_from:P13',
    ])
    const from = plan.rows.find((r) => r.itemType === 'level_from' && r.itemCode === 'P13')!
    expect(from.sellPrice).toBe(expected.priceFrom.P13 + (p13.sellPrice - snapshot.level.P13!))
    expect(from.costAtPublish).toBe(plan.review.priceFrom.P13!.cost)
  })

  it('unapproved and minor changes keep their published price', () => {
    const changed = withOptionCost('R16', 5, withLevelCost('P13', 1000))
    const plan = planPublication(changed, snapshot, [itemKey('level', 'P13')])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const r16 = plan.rows.find((r) => r.itemCode === 'R16')!
    expect(r16.sellPrice).toBe(snapshot.option.R16)
  })

  it('blocks a publication that leaves a level under the minimum margin, with the fix', () => {
    // P01 cost rises, but only RAM gets approved — P01 keeps its old price and breaks the floor.
    const p01 = catalog.levels.find((l) => l.code === 'P01')!
    const broken = withOptionCost('R32', 300, withLevelCost('P01', p01.partsCost * 0.12))
    const plan = planPublication(broken, snapshot, [itemKey('option', 'R32')])
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    const problem = plan.problems.find((p) => p.kind === 'below_min_margin')
    expect(problem).toMatchObject({ kind: 'below_min_margin', level: 'P01' })
    if (problem?.kind !== 'below_min_margin') return
    expect(problem.minLevelPrice).toBeGreaterThan(snapshot.level.P01!)

    const message = problemMessage(problem, catalog.settings.minMargin)
    expect(message).toContain('Poziom P01')
    expect(message).toContain('poniżej marży 11,00%')
    expect(message).toMatch(/podnieś ją do min\. [\d\s ]+ zł/)
  })

  it('approving the level as well clears the guard', () => {
    const p01 = catalog.levels.find((l) => l.code === 'P01')!
    const broken = withOptionCost('R32', 300, withLevelCost('P01', p01.partsCost * 0.12))
    const plan = planPublication(broken, snapshot, [
      itemKey('option', 'R32'),
      itemKey('level', 'P01'),
    ])
    expect(plan.ok).toBe(true)
  })

  it('a new item is always published, even when not ticked', () => {
    const extra: Catalog = {
      ...withLevelCost('P13', 1000),
      options: [
        ...catalog.options,
        { ...catalog.options.find((o) => o.code === 'R16')!, code: 'R16NEW' },
      ],
    }
    const plan = planPublication(extra, snapshot, [itemKey('level', 'P13')])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.rows.some((r) => r.itemCode === 'R16NEW')).toBe(true)
    expect(plan.changes.some((r) => r.itemCode === 'R16NEW')).toBe(true)
  })

  it('only a new item in the queue: publishes without ticking anything', () => {
    const extra: Catalog = {
      ...catalog,
      options: [
        ...catalog.options,
        { ...catalog.options.find((o) => o.code === 'R16')!, code: 'R16NEW' },
      ],
    }
    const plan = planPublication(extra, snapshot, [])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.changes.map((r) => r.itemCode)).toEqual(['R16NEW'])
  })

  it('refuses an empty selection and keys that are not in the queue (stale panel)', () => {
    expect(planPublication(catalog, snapshot, [])).toMatchObject({
      ok: false,
      problems: [{ kind: 'nothing_selected' }],
    })
    expect(planPublication(catalog, snapshot, ['level:P13', 'option:constructor'])).toMatchObject({
      ok: false,
      problems: [{ kind: 'stale_queue', keys: ['level:P13', 'option:constructor'] }],
    })
  })

  it('a level with no compatible configuration blocks publication', () => {
    // Only DDR4 RAM stays active: DDR5 levels have nothing to sell.
    const onlyDdr4: Catalog = {
      ...withLevelCost('P01', 1000),
      options: catalog.options.map((o) =>
        o.type === 'ram' && o.ramType === 'DDR5' ? { ...o, active: false } : o,
      ),
    }
    const plan = planPublication(onlyDdr4, snapshot, [itemKey('level', 'P01')])
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    const levels = plan.problems.filter((p) => p.kind === 'no_compatible_config')
    expect(levels.length).toBeGreaterThan(0)
    expect(problemMessage(levels[0]!, 0.11)).toContain('nie ma żadnej zgodnej konfiguracji')
  })
})

describe('builds overview (ADR-G002 §4.5)', () => {
  const builds = expected.builds.map((b) => ({ slug: b.slug, name: b.name, config: b.config }))

  it('price, cost and margin of the 16 builds = fixtures; no change without a previous batch', () => {
    const rows = buildsOverview(builds, catalog, snapshot, null)
    for (const [i, row] of rows.entries()) {
      expect(row.price, row.slug).toBe(expected.builds[i]!.price)
      expect(row.cost, row.slug).toBe(expected.builds[i]!.cost)
      expect(row.margin!).toBeCloseTo(expected.builds[i]!.margin, 6)
      expect(row.change).toBeNull()
    }
  })

  it('change = difference against the previous batch', () => {
    const previous = { ...snapshot, level: { ...snapshot.level, P13: snapshot.level.P13! - 200 } }
    const wampir = buildsOverview(builds, catalog, snapshot, previous).find(
      (r) => r.slug === 'wampir',
    )!
    expect(wampir.change).toBe(200)
  })
})
