import { describe, expect, it } from 'vitest'

import { firstBatch, firstBatchPublishedAt, seed } from '../../seed/offer'
import type { CostOption } from '../../lib/pricing/catalog'
import { sellOption } from '../../lib/pricing/cost'
import { snapshotFromRows } from '../../lib/pricing/snapshot'
import { seedCatalog } from '../../lib/pricing/testing/seedCatalog'
import { optionPreview } from './preview'

const catalog = seedCatalog()
const snapshot = snapshotFromRows(
  firstBatch().map((row) => ({ ...row, batch: 1, publishedAt: firstBatchPublishedAt() })),
)
const label = new Map(seed.options.map((o) => [o.code, o.publicLabel]))
const others = catalog.options.map((o) => ({ code: o.code, label: label.get(o.code)!, option: o }))

const newCase: CostOption = {
  type: 'case',
  code: 'NOWA',
  cost: 410,
  active: false,
  gpuMaxMm: 400,
  coolerMaxMm: 170,
  aio360: 'front',
  class: 2,
}

describe('optionPreview (Dodaj obudowę …)', () => {
  it('the price is the publication price (sellOption) of lib/pricing', () => {
    const preview = optionPreview(newCase, catalog.settings, others, snapshot)
    expect(preview.price).toBe(sellOption(newCase, catalog.settings))
    expect(preview.rule).toMatch(/^koszt .*zł, w górę do \d+ zł$/)
  })

  it('compares with the cheapest published case of the same class', () => {
    const preview = optionPreview(newCase, catalog.settings, others, snapshot)
    const sameClass = catalog.options.filter((o) => o.type === 'case' && o.active && o.class === 2)
    const cheapest = Math.min(...sameClass.map((o) => snapshot.option[o.code]!))
    expect(preview.versus?.amount).toBe(preview.price - cheapest)
    expect(sameClass.map((o) => label.get(o.code))).toContain(preview.versus?.label)
  })

  it('RAM compares within its memory type and shows the markup floor', () => {
    const ram: CostOption = {
      type: 'ram',
      code: 'NOWY',
      cost: 500,
      active: false,
      ramType: 'DDR4',
      capacityGb: 16,
    }
    const preview = optionPreview(ram, catalog.settings, others, snapshot)
    expect(preview.price).toBe(sellOption(ram, catalog.settings))
    const ddr4 = catalog.options.filter((o) => o.type === 'ram' && o.ramType === 'DDR4')
    expect(ddr4.map((o) => label.get(o.code))).toContain(preview.versus?.label)
    expect(preview.rule).toMatch(/^koszt \+ [\d,]+%, w górę do/)
  })
})
