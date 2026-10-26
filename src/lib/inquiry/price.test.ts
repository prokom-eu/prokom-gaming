import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { sellPrices } from '../pricing/cost'
import type { PriceSnapshot } from '../pricing/snapshot'
import { seedCatalog } from '../pricing/testing/seedCatalog'
import { priceComputer, type InquiryOffer } from './price'

const catalog = seedCatalog()
const snapshot: PriceSnapshot = {
  ...sellPrices(catalog),
  batch: 3,
  publishedAt: '2026-10-25T12:00:00.000Z',
  levelFrom: {},
}
const offer: InquiryOffer = {
  levels: catalog.levels,
  options: catalog.options,
  builds: expected.builds.map((b, i) => ({
    id: i + 1,
    slug: b.slug,
    name: b.name,
    config: b.config,
  })),
}

const wampir = expected.builds.find((b) => b.slug === 'wampir')
if (!wampir) throw new Error('fixtures: no wampir')

describe('priceComputer', () => {
  it('prices every build exactly as the fixtures (ADR-G002 §8)', () => {
    for (const b of expected.builds) {
      const result = priceComputer({ build: b.slug }, offer, snapshot)
      expect(result.ok && result.price, b.slug).toBe(b.price)
    }
  })

  it('keeps the build, its recipe and the batch of the prices', () => {
    const result = priceComputer({ build: 'wampir' }, offer, snapshot)
    expect(result).toMatchObject({
      ok: true,
      build: { slug: 'wampir', name: wampir.name },
      config: wampir.config,
      batch: 3,
    })
  })

  it('applies the customer changes to the recipe and prices the result', () => {
    // „Bies + 32 GB”: the Bies build with one option changed („Dopasuj”).
    const scenario = expected.scenarios.find((s) => s.name === 'Bies + 32 GB')
    const bies = expected.builds.find((b) => b.slug === 'bies')
    if (!scenario || !bies) throw new Error('fixtures: no Bies scenario')
    const result = priceComputer(
      { build: 'bies', config: { ram: scenario.config.ram } },
      offer,
      snapshot,
    )
    expect(result.ok && result.price).toBe(scenario.price)
    expect(result.ok && result.config).toEqual(scenario.config)
    expect(result.ok && result.build?.slug).toBe('bies')
  })

  it('every scenario: valid ones priced as fixtures, broken ones rejected with the rules', () => {
    for (const s of expected.scenarios) {
      const result = priceComputer({ config: s.config }, offer, snapshot)
      if (s.errors.length === 0) {
        expect(result.ok && result.price, s.name).toBe(s.price)
      } else {
        expect(result, s.name).toEqual({ ok: false, fields: ['config'], compat: s.errors })
      }
    }
  })

  it('rejects an unknown build', () => {
    expect(priceComputer({ build: 'smok' }, offer, snapshot)).toEqual({
      ok: false,
      fields: ['build'],
    })
  })

  it('rejects unknown codes and codes in the wrong slot, naming the field', () => {
    const result = priceComputer(
      { config: { ...wampir.config, ram: 'NOPE', ssd: wampir.config.cooler } },
      offer,
      snapshot,
    )
    expect(result).toEqual({ ok: false, fields: ['config.ram', 'config.ssd'] })
  })

  it('rejects an option that is not on sale', () => {
    const inactive: InquiryOffer = {
      ...offer,
      options: offer.options.map((o) =>
        o.code === wampir.config.ram ? { ...o, active: false } : o,
      ),
    }
    expect(priceComputer({ build: 'wampir' }, inactive, snapshot)).toEqual({
      ok: false,
      fields: ['config.ram'],
    })
  })

  it('rejects a code without a published price', () => {
    const { [wampir.config.level]: _dropped, ...level } = snapshot.level
    expect(priceComputer({ build: 'wampir' }, offer, { ...snapshot, level })).toEqual({
      ok: false,
      fields: ['config.level'],
    })
  })

  it('ignores inherited keys of the price list (codes come from the network)', () => {
    const result = priceComputer(
      { config: { ...wampir.config, ram: 'constructor' } },
      offer,
      snapshot,
    )
    expect(result).toEqual({ ok: false, fields: ['config.ram'] })
  })
})
