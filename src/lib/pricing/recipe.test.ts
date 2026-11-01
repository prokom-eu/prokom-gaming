import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { firstBatch, firstBatchPublishedAt } from '../../seed/offer'
import { costContext, costList, evaluate } from './cost'
import { recipeFigures } from './recipe'
import { snapshotFromRows } from './snapshot'
import { seedCatalog } from './testing/seedCatalog'

// The editor's live numbers must be lib/pricing (panel spec §18 pt 5): batch 1 and a change.
const catalog = seedCatalog()
const snapshot = snapshotFromRows(
  firstBatch().map((row) => ({ ...row, batch: 1, publishedAt: firstBatchPublishedAt() })),
)

describe('recipeFigures (build editor)', () => {
  it('equals evaluate() for all 16 builds of batch 1', () => {
    const ctx = costContext(catalog, snapshot)
    for (const b of expected.builds) {
      const live = recipeFigures(b.config, snapshot, costList(catalog))
      const evaluated = evaluate(b.config, ctx)!
      expect(live.price).toBe(evaluated.price)
      expect(live.cost).toBeCloseTo(evaluated.cost, 6)
      expect(live.margin).toBeCloseTo(evaluated.margin, 10)
    }
  })

  it('Bazyliszek costs 11 930 zł; another case gives the price of lib/pricing', () => {
    const bazyliszek = expected.builds.find((b) => b.slug === 'bazyliszek')!
    expect(recipeFigures(bazyliszek.config, snapshot, costList(catalog)).price).toBe(11930)
    const other = catalog.options.find(
      (o) => o.type === 'case' && o.active && o.code !== bazyliszek.config.case,
    )!
    const changed = { ...bazyliszek.config, case: other.code }
    expect(recipeFigures(changed, snapshot, costList(catalog)).price).toBe(
      evaluate(changed, costContext(catalog, snapshot))!.price,
    )
  })

  it('an unknown cost or price gives no margin', () => {
    const b = expected.builds[0]!
    const costs = costList(catalog)
    costs.option[b.config.ram] = Number.NaN
    expect(recipeFigures(b.config, snapshot, costs)).toMatchObject({ cost: null, margin: null })
    expect(recipeFigures({ ...b.config, ssd: 'NIE-MA' }, snapshot, costList(catalog)).price).toBe(
      null,
    )
  })
})
