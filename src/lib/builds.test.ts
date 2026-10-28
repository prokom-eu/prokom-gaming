import { describe, expect, it } from 'vitest'

import pricingExpected from '../../tests/fixtures/pricing-expected.json'
import { seed } from '../seed/offer'
import {
  buildCards,
  buildsWord,
  filtersQuery,
  matchesFilters,
  NO_FILTERS,
  parseFilters,
  sheetFilterCount,
  type BuildFilters,
} from './builds'
import { buildHero } from './home'
import {
  seedBuilds,
  seedExtras,
  seedFpsTable,
  seedLevels,
  seedOptions,
  seedSnapshot,
} from './testing/offerFromSeed'

const hero = buildHero({
  builds: seedBuilds,
  levels: seedLevels,
  options: seedOptions,
  snapshot: seedSnapshot,
  fps: seedFpsTable,
})
const cards = buildCards(hero, seedExtras)
const slugsFor = (filters: Partial<BuildFilters>) =>
  cards.filter((c) => matchesFilters(c.facets, { ...NO_FILTERS, ...filters })).map((c) => c.slug)

describe('buildCards', () => {
  // Money: the list shows the published price (= fixtures), in price order (spec. §5).
  it('lists the 16 builds by price with the fixture prices', () => {
    const expected = [...pricingExpected.builds].sort((a, b) => a.price - b.price)
    expect(cards.map((c) => c.slug)).toEqual(expected.map((b) => b.slug))
    expect(cards.map((c) => c.price)).toEqual(expected.map((b) => b.price))
  })

  it('fills a card like the board (Wampir)', () => {
    const wampir = cards.find((c) => c.slug === 'wampir')!
    expect(wampir).toMatchObject({
      name: 'Wampir',
      key: 'wampir',
      short: 'Słowo „wampir” ma słowiańskie korzenie.',
      tierRoman: 'VII',
      tierLabel: '4K',
      specs: ['Ryzen 7 9800X3D', 'RTX 5070 Ti 16 GB', 'monitor 4K'],
      fpsLabel: 'Cyberpunk 2077, 4K',
    })
    expect(wampir.fps).toEqual({ fps: expect.any(Number), kind: expect.any(String) })
    expect(cards.find((c) => c.slug === 'strzyga')!.fpsLabel).toBe('Cyberpunk 2077, 2K')
  })

  // ADR-G002 §8.7: nothing from the panel side reaches the page.
  // Cases keep their full name on purpose (ADR-G002 §8.7), so only level parts, RAM and SSD count.
  it('carries no internal model or cost', () => {
    const json = JSON.stringify(cards)
    const internal = [
      ...seed.levels.flatMap((l) => l.components.map((c) => c.internalModel)),
      ...seed.options
        .filter((o) => o.type === 'ram' || o.type === 'ssd')
        .map((o) => o.internalModel),
    ].filter((m) => json.includes(m))
    expect(internal).toEqual([])
    expect(json).not.toMatch(/"cost"|internalModel/)
  })

  it('skips a build without extras', () => {
    expect(buildCards(hero, new Map())).toEqual([])
  })
})

describe('filters (spec. §5, board Zestawy JS)', () => {
  it('monitor: FullHD = Moc I–IV, 2K = IV–VII, 4K = VII–IX', () => {
    expect(slugsFor({ monitor: 'fullhd' })).toEqual([
      'skrzat',
      'licho',
      'bies',
      'wodnik',
      'strzyga',
    ])
    expect(slugsFor({ monitor: '2k' })).toEqual([
      'strzyga',
      'kikimora',
      'zmora',
      'rusalka',
      'baba-jaga',
      'bazyliszek',
      'pani-zimy',
      'wilkolak',
      'wampir',
    ])
    expect(slugsFor({ monitor: '4k' })).toEqual(['wilkolak', 'wampir', 'weles', 'zmij', 'perun'])
  })

  it('budget: < 9 000, 9 000–15 000, > 15 000', () => {
    expect(slugsFor({ budget: 'do9' })).toEqual(['skrzat', 'licho', 'bies', 'wodnik', 'strzyga'])
    expect(slugsFor({ budget: '9-15' })).toHaveLength(8)
    expect(slugsFor({ budget: 'od15' })).toEqual(['weles', 'zmij', 'perun'])
  })

  it('budget edges are inclusive in the middle range', () => {
    const facets = { monitors: [], vendor: 'amd', white: false } as const
    const at = (price: number) =>
      (['do9', '9-15', 'od15'] as const).filter((budget) =>
        matchesFilters({ ...facets, monitors: [], price }, { ...NO_FILTERS, budget }),
      )
    expect(at(8990)).toEqual(['do9'])
    expect(at(9000)).toEqual(['9-15'])
    expect(at(15000)).toEqual(['9-15'])
    expect(at(15010)).toEqual(['od15'])
    // Without a price a build matches no budget (it still shows under „Każdy”).
    expect(
      matchesFilters({ ...facets, monitors: [], price: null }, { ...NO_FILTERS, budget: 'do9' }),
    ).toBe(false)
  })

  it('kind: Intel by platform, white by shell', () => {
    expect(slugsFor({ kind: 'intel' })).toEqual(['wodnik', 'wilkolak'])
    expect(slugsFor({ kind: 'amd' })).toHaveLength(14)
    expect(slugsFor({ kind: 'biale' })).toEqual(['rusalka', 'pani-zimy'])
  })

  it('combines the groups; an impossible mix is empty', () => {
    expect(slugsFor({ monitor: '2k', budget: '9-15', kind: 'biale' })).toEqual([
      'rusalka',
      'pani-zimy',
    ])
    expect(slugsFor({ monitor: 'fullhd', budget: 'od15' })).toEqual([])
    expect(slugsFor({})).toHaveLength(16)
  })
})

describe('filters in the address', () => {
  it('reads known values and ignores the rest', () => {
    expect(parseFilters({ monitor: '2k', budzet: '9-15', rodzaj: 'biale' })).toEqual({
      monitor: '2k',
      budget: '9-15',
      kind: 'biale',
    })
    expect(parseFilters(new URLSearchParams('monitor=8k&budzet=&rodzaj=constructor'))).toEqual(
      NO_FILTERS,
    )
    expect(parseFilters({ monitor: ['4k', 'fullhd'] }).monitor).toBe('4k')
  })

  it('writes a stable query and round-trips', () => {
    const filters: BuildFilters = { monitor: '4k', budget: 'od15', kind: 'amd' }
    expect(filtersQuery(filters)).toBe('?monitor=4k&budzet=od15&rodzaj=amd')
    expect(parseFilters(new URLSearchParams(filtersQuery(filters)))).toEqual(filters)
    expect(filtersQuery(NO_FILTERS)).toBe('')
  })

  it('counts the sheet filters and says „zestaw” in Polish', () => {
    expect(sheetFilterCount({ monitor: '2k', budget: null, kind: null })).toBe(0)
    expect(sheetFilterCount({ monitor: null, budget: 'do9', kind: 'intel' })).toBe(2)
    expect([1, 2, 5, 12, 16, 22].map((n) => `${n} ${buildsWord(n)}`)).toEqual([
      '1 zestaw',
      '2 zestawy',
      '5 zestawów',
      '12 zestawów',
      '16 zestawów',
      '22 zestawy',
    ])
  })
})
