import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import pricingExpected from '../../tests/fixtures/pricing-expected.json'
import {
  firstBatch,
  firstBatchPublishedAt,
  mapBuild,
  mapOption,
  mapPowerLevel,
  mapPricingSettings,
  mapSiteSettings,
  seed,
  SERVICE_CODE,
} from './offer'

const ROOT = path.resolve(__dirname, '../..')
const SEED_ONLY_KEYS = ['_check', '_verify', '_info', 'aio360Raw', 'serviceCostBreakdown']

/** Every key of an object tree, so a seed-only key cannot hide in a nested group. */
function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys)
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...allKeys(inner)])
  }
  return []
}

const refs = { level: 1, case: 2, cooler: 3, ram: 4, ssd: 5 }

describe('offer seed data', () => {
  it('has 16 power levels, 57 options and 16 builds with creatures', () => {
    expect(seed.levels).toHaveLength(16)
    expect(seed.options).toHaveLength(57)
    expect(seed.builds).toHaveLength(16)
    expect(seed.creatures.map((c) => c.slug)).toEqual(seed.builds.map((b) => b.creature))
  })

  it('every build points at existing codes of the right type', () => {
    const levels = new Set(seed.levels.map((p) => p.code))
    const optionType = new Map(seed.options.map((o) => [o.code, o.type]))
    for (const b of seed.builds) {
      expect(levels.has(b.level), b.slug).toBe(true)
      expect(optionType.get(b.case), b.slug).toBe('case')
      expect(optionType.get(b.cooler), b.slug).toBe('cooler')
      expect(optionType.get(b.ram), b.slug).toBe('ram')
      expect(optionType.get(b.ssd), b.slug).toBe('ssd')
    }
    const builds = new Set(seed.builds.map((b) => b.slug))
    for (const p of seed.levels) expect(builds.has(p.leadBuild), p.code).toBe(true)
  })

  it('has a photo file for every case and cooler (46)', () => {
    const withImage = seed.options.filter((o) => o.image)
    expect(withImage).toHaveLength(46)
    for (const o of withImage) {
      expect(existsSync(path.join(ROOT, 'seed/prokomgaming/media', o.image!)), o.code).toBe(true)
    }
  })

  // The creature colour is not stored in the database: tokens.css is its only source (ADR-G003 §2).
  it('every creature colour is a token in tokens.css', () => {
    const tokens = readFileSync(path.join(ROOT, 'src/styles/tokens.css'), 'utf8').toLowerCase()
    for (const c of creaturesWithColour()) {
      expect(tokens, c.slug).toContain(`--c-${c.slug}: ${c.color.toLowerCase()};`)
    }
  })
})

function creaturesWithColour(): { slug: string; color: string }[] {
  return JSON.parse(readFileSync(path.join(ROOT, 'seed/prokomgaming/creatures.json'), 'utf8')).items
}

describe('mapping to Payload documents', () => {
  it('copies no seed-only keys', () => {
    const docs = [
      ...seed.options.map((o) => mapOption(o, null)),
      ...seed.levels.map(mapPowerLevel),
      ...seed.builds.map((b, i) => mapBuild(b, seed.creatures[i]!, refs)),
      mapPricingSettings(seed.pricingSettings),
      mapSiteSettings(seed.siteSettings),
    ]
    for (const key of allKeys(docs)) expect(SEED_ONLY_KEYS).not.toContain(key)
  })

  it('keeps an option and its internal fields', () => {
    const ram = seed.options.find((o) => o.code === 'R16D4')!
    expect(mapOption(ram, null)).toMatchObject({
      type: 'ram',
      internalModel: ram.internalModel,
      cost: 594,
      ramType: 'DDR4',
      capacityGb: 16,
      active: true,
    })
  })

  it('maps sheet markup classes to settings keys', () => {
    const settings = mapPricingSettings(seed.pricingSettings)
    expect(settings.levelMarkupByClass).toEqual({
      fullhd: 0.17,
      qhd: 0.16,
      uhd: 0.145,
      flagship: 0.135,
    })
    for (const p of seed.levels) {
      expect(Object.keys(settings.levelMarkupByClass)).toContain(mapPowerLevel(p).markupClass)
    }
    const skrzat = mapPowerLevel(seed.levels.find((p) => p.code === 'P01')!)
    expect(skrzat).toMatchObject({ markupClass: 'fullhd', markupOverride: 0.168, variant: null })
  })

  it('takes creature texts 1:1 and the graphics key', () => {
    const baba = seed.creatures.find((c) => c.slug === 'baba-jaga')!
    const build = seed.builds.find((b) => b.slug === 'baba-jaga')!
    const doc = mapBuild(build, baba, refs)
    expect(doc.creature.key).toBe('baba')
    expect(doc.creature).not.toHaveProperty('color')
    expect(doc.creature.legend).toBe(baba.legend)
    expect(doc.creature.legendSource).toEqual(baba.legendSource)
  })
})

describe('first price batch', () => {
  const batch = firstBatch()
  const sell = (itemType: string, itemCode: string) =>
    batch.find((r) => r.itemType === itemType && r.itemCode === itemCode)?.sellPrice

  it('has every level, option, the service and every "price from" once (90)', () => {
    expect(batch).toHaveLength(16 + 57 + 1 + 16)
    const keys = batch.map((r) => `${r.itemType}:${r.itemCode}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  // Money: the batch the site will read must give the sheet's price for each of the 16 builds.
  it('prices each build exactly as the fixtures', () => {
    for (const expected of pricingExpected.builds) {
      const { level, case: kase, cooler, ram, ssd } = expected.config
      const total =
        sell('level', level)! +
        sell('option', kase)! +
        sell('option', cooler)! +
        sell('option', ram)! +
        sell('option', ssd)! +
        sell('service', SERVICE_CODE)!
      expect(total, expected.slug).toBe(expected.price)
    }
  })

  it('has "price from" of every level as the fixtures', () => {
    for (const [code, price] of Object.entries(pricingExpected.priceFrom)) {
      expect(sell('level_from', code), code).toBe(price)
    }
  })

  it('records costs at publish, except for "price from"', () => {
    expect(batch.find((r) => r.itemCode === 'P01' && r.itemType === 'level')?.costAtPublish).toBe(
      2847,
    )
    expect(batch.find((r) => r.itemType === 'service')?.costAtPublish).toBe(150)
    expect(
      batch.filter((r) => r.itemType === 'level_from').every((r) => r.costAtPublish === null),
    ).toBe(true)
  })

  it('is dated 25.10.2026', () => {
    expect(firstBatchPublishedAt().slice(0, 10)).toBe('2026-10-25')
  })
})
