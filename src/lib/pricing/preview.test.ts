import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { firstBatch, firstBatchPublishedAt, seed } from '../../seed/offer'
import type { Catalog } from './catalog'
import { costContext, evaluate } from './cost'
import { clientView, previewPublication, whatIfBuilds } from './preview'
import { buildQueue, buildsOverview, itemKey, planPublication, pricesAfterQueue } from './publish'
import { snapshotFromRows } from './snapshot'
import { seedCatalog } from './testing/seedCatalog'
import { whatIf } from './whatIf'

// Panel numbers must equal lib/pricing for batch 1 and a sample cost change (spec §18 pt 5).
const catalog = seedCatalog()
const snapshot = snapshotFromRows(
  firstBatch().map((row) => ({ ...row, batch: 1, publishedAt: firstBatchPublishedAt() })),
)
const builds = expected.builds.map(({ slug, name, config }) => ({ slug, name, config }))
const levelParts = new Map(seed.levels.map((l) => [l.code, l.components]))
const limits = { warnMargin: 0.12, minMargin: catalog.settings.minMargin }

function withOptionCosts(type: string, factor: number): Catalog {
  return {
    ...catalog,
    options: catalog.options.map((o) => (o.type === type ? { ...o, cost: o.cost * factor } : o)),
  }
}

describe('whatIf (Co jeśli?)', () => {
  const data = whatIfBuilds(builds, catalog, snapshot, levelParts)

  it('covers all 16 builds with costs that add up to lib/pricing', () => {
    expect(data).toHaveLength(16)
    const ctx = costContext(catalog, snapshot)
    for (const [i, b] of data.entries()) {
      const evaluated = evaluate(builds[i]!.config, ctx)!
      const sum = Object.values(b.costs).reduce((a, c) => a + c, 0)
      expect(sum).toBeCloseTo(evaluated.cost, 6)
      expect(b.price).toBe(evaluated.price)
    }
  })

  it('without shifts gives the margins of buildsOverview', () => {
    const rows = buildsOverview(builds, catalog, snapshot, null)
    const result = whatIf(data, {}, limits)
    const margins = rows.map((r) => r.margin!)
    expect(result.averageMargin).toBeCloseTo(margins.reduce((a, m) => a + m, 0) / 16, 10)
    expect(result.weakest!.margin).toBeCloseTo(Math.min(...margins), 10)
  })

  it('RAM +8% equals evaluating with 8% dearer RAM at the same prices', () => {
    const dearer = buildsOverview(builds, withOptionCosts('ram', 1.08), snapshot, null)
    const result = whatIf(data, { ram: 0.08 }, limits)
    const weakest = dearer.reduce((a, r) => (r.margin! < a.margin! ? r : a))
    expect(result.weakest).toEqual({ name: weakest.name, margin: expect.any(Number) })
    expect(result.weakest!.margin).toBeCloseTo(weakest.margin!, 10)
    expect(result.belowMin).toBe(dearer.filter((r) => r.margin! < limits.minMargin).length)
    expect(result.belowWarn).toBe(dearer.filter((r) => r.margin! < limits.warnMargin).length)
  })
})

describe('previewPublication (Do zatwierdzenia)', () => {
  // RAM 8% dearer: the RAM options go above the threshold (as on the board).
  const ram = withOptionCosts('ram', 1.08)
  const queue = buildQueue(ram, snapshot)
  const ramKeys = queue.items.filter((i) => i.itemType === 'option').map((i) => i.key)

  it('agrees with planPublication for the whole queue', () => {
    const keys = queue.items.map((i) => i.key)
    const preview = previewPublication(ram, snapshot, builds, keys)
    const plan = planPublication(ram, snapshot, keys)
    expect(preview.ok).toBe(plan.ok)
    expect(preview.compatible).toBe(plan.review!.compatible)
    expect(preview.lowest!.margin).toBe(plan.review!.minMargin!.margin)
    expect(preview.count).toBe(keys.length)
  })

  it('the client view equals the builds priced after the queue', () => {
    const keys = queue.items.map((i) => i.key)
    const preview = previewPublication(ram, snapshot, builds, keys)
    const after = clientView(builds, ram, pricesAfterQueue(queue), queue.effectivePublished)
    expect(preview.client).toEqual(after)
    expect(preview.client.dearer + preview.client.cheaper + preview.client.same).toBe(16)
  })

  it('nothing selected: blocked with a message, builds unchanged', () => {
    expect(ramKeys.length).toBeGreaterThan(0)
    const preview = previewPublication(ram, snapshot, builds, [])
    expect(preview.ok).toBe(false)
    expect(preview.messages).toEqual(['Nie zaznaczono żadnej pozycji do publikacji.'])
    expect(preview.client.same).toBe(16)
  })

  it('a stale key is reported like on publishing', () => {
    const preview = previewPublication(catalog, snapshot, builds, [itemKey('option', 'R16D4')])
    expect(preview.ok).toBe(false)
    expect(preview.messages[0]).toMatch(/Kolejka zmieniła się/)
  })
})
