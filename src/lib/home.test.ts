import { describe, expect, it } from 'vitest'

import pricingExpected from '../../tests/fixtures/pricing-expected.json'
import { firstBatch, firstBatchPublishedAt, seed } from '../seed/offer'
import { buildFpsTable } from './fps'
import {
  buildHero,
  dateText,
  HERO_DEFAULT,
  materialOf,
  rotationOf,
  siblingsText,
  type HeroBuildInput,
  type HeroLevelInput,
  type HeroOptionInput,
} from './home'
import { zl } from './pricing/format'
import { snapshotFromRows } from './pricing/snapshot'

// The hero built from the seed, as `loadHero()` maps the database (codes instead of ids).
const creature = new Map(seed.creatures.map((c) => [c.slug, c]))
const builds: HeroBuildInput[] = seed.builds.map((b) => {
  const c = creature.get(b.creature)!
  return {
    slug: b.slug,
    name: b.name,
    config: { level: b.level, case: b.case, cooler: b.cooler, ram: b.ram, ssd: b.ssd },
    creature: {
      key: c.id,
      accusative: c.accusative,
      epithet: c.epithet,
      look: c.look,
      heroTitle: c.heroTitle,
      heroText: c.heroText,
    },
  }
})
const levels: HeroLevelInput[] = seed.levels.map((l) => ({
  code: l.code,
  tier: l.tier,
  tierRoman: l.tierRoman,
  tierLabel: l.tierLabel,
  tierLead: l.tierLead,
  targetResolution: l.targetResolution,
  leadBuild: l.leadBuild,
  cpu: l.components.find((c) => c.role === 'cpu')?.publicLabel ?? null,
  gpu: l.components.find((c) => c.role === 'gpu')?.publicLabel ?? null,
}))
const options: HeroOptionInput[] = seed.options.map((o) => ({
  code: o.code,
  publicLabel: o.publicLabel,
  photo: o.image ? { src: `/api/media/file/${o.code}.webp`, alt: o.publicLabel } : null,
}))
const snapshot = snapshotFromRows(
  firstBatch().map((row) => ({ ...row, batch: 1, publishedAt: firstBatchPublishedAt() })),
)
const fps = buildFpsTable([
  {
    build: 'wampir',
    game: 'counter-strike-2',
    resolution: 'uhd',
    fps: 194,
    kind: 'm',
    sourceLabel: 'test',
    sourceUrl: null,
    setting: 'wysokie',
    measuredAt: null,
  },
])

const hero = buildHero({ builds, levels, options, snapshot, fps })
const bySlug = new Map(hero.builds.map((b) => [b.slug, b]))

describe('buildHero', () => {
  it('has all 16 builds in level order and 9 tiers', () => {
    expect(hero.builds.map((b) => b.slug)).toEqual(seed.builds.map((b) => b.slug))
    expect(hero.tiers.map((t) => t.roman)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
      'VII',
      'VIII',
      'IX',
    ])
  })

  it('groups the creatures of a tier like the board medallions', () => {
    const names = (roman: string) =>
      hero.tiers.find((t) => t.roman === roman)!.builds.map((s) => bySlug.get(s)!.name)
    expect(names('III')).toEqual(['Bies', 'Wodnik'])
    expect(names('V')).toEqual(['Kikimora', 'Zmora', 'Rusałka'])
    expect(names('VI')).toEqual(['Baba Jaga', 'Bazyliszek', 'Pani Zimy'])
    expect(names('VII')).toEqual(['Wilkołak', 'Wampir'])
  })

  it('rotates through the lead creature of each tier (board order)', () => {
    expect(rotationOf(hero)).toEqual([
      'skrzat',
      'licho',
      'bies',
      'strzyga',
      'kikimora',
      'baba-jaga',
      'wampir',
      'weles',
      'perun',
    ])
    expect(rotationOf(hero)).toContain(HERO_DEFAULT)
    expect(hero.tiers.map((t) => t.resolutionLabel)).toEqual([
      'FullHD',
      'FullHD',
      'FullHD',
      '2K',
      '2K',
      '2K',
      '4K',
      '4K',
      '4K',
    ])
  })

  // Money: the hero price is the published sum, the same as the build page and the inquiry.
  it('prices every creature as the fixtures', () => {
    for (const expected of pricingExpected.builds) {
      expect(bySlug.get(expected.slug)?.price, expected.slug).toBe(expected.price)
    }
    expect(hero.pricedAt?.slice(0, 10)).toBe('2026-10-25')
  })

  it('fills the Wampir card from public labels only', () => {
    const wampir = bySlug.get('wampir')!
    expect(wampir).toMatchObject({
      key: 'wampir',
      accusative: 'Wampira',
      epithet: 'Bezsenny',
      heroTitle: '4K na wysokich ustawieniach',
      tierRoman: 'VII',
      tierLabel: '4K',
      resolution: 'uhd',
      cpu: 'Ryzen 7 9800X3D',
      gpu: 'RTX 5070 Ti 16 GB',
      material: 'krew',
      photo: { src: '/api/media/file/LB500.webp', alt: expect.any(String) },
    })
    expect(wampir.fps).toEqual([{ fps: 194, kind: 'm' }, null])
  })

  it('never carries a cost or an internal model to the browser', () => {
    const text = JSON.stringify(hero)
    expect(text).not.toMatch(/cost|internalModel|markup|margin/i)
    for (const level of seed.levels) {
      for (const part of level.components) {
        if (part.internalModel !== part.publicLabel) expect(text).not.toContain(part.internalModel)
      }
    }
  })

  it('has no price without a published batch', () => {
    const empty = buildHero({ builds, levels, options, snapshot: null, fps: {} })
    expect(empty.builds.every((b) => b.price === null)).toBe(true)
    expect(empty.pricedAt).toBeNull()
  })
})

describe('hero texts', () => {
  it('names the materials from the board', () => {
    expect(materialOf('wampir')).toBe('krew')
    expect(materialOf('pani-zimy')).toBe('lod')
    expect(materialOf('zmij')).toBe('ogien')
    expect(materialOf('perun')).toBe('zloto')
    expect(materialOf('licho')).toBe('kosc')
  })

  it('counts the computers of a tier in Polish', () => {
    expect(siblingsText(1)).toBe('jedyny na tym poziomie')
    expect(siblingsText(2)).toBe('2 komputery na tym poziomie')
    expect(siblingsText(3)).toBe('3 komputery na tym poziomie')
    expect(siblingsText(5)).toBe('5 komputerów na tym poziomie')
    expect(siblingsText(12)).toBe('12 komputerów na tym poziomie')
  })

  it('formats prices with a non-breaking space, also below 10 000', () => {
    expect(zl(4990)).toBe('4 990 zł')
    expect(zl(14540)).toBe('14 540 zł')
    expect(zl(990)).toBe('990 zł')
  })

  it('dates the batch in Polish time', () => {
    expect(dateText('2026-10-24T23:30:00.000Z')).toBe('25.10.2026')
  })
})
