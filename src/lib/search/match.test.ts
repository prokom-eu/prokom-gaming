import { describe, expect, it } from 'vitest'

import { fpsSeed } from '../../seed/fps'
import { seed } from '../../seed/offer'
import { fpsFor } from '../fps'
import { buildHero } from '../home'
import {
  seedBuilds,
  seedFpsTable,
  seedLevels,
  seedOptions,
  seedSnapshot,
} from '../testing/offerFromSeed'
import { isEmpty, popular, prepareSearch, searchSite } from './match'
import { buildSearchIndex, searchPages } from './searchIndex'

const hero = buildHero({
  builds: seedBuilds,
  levels: seedLevels,
  options: seedOptions,
  snapshot: seedSnapshot,
  fps: seedFpsTable,
})
const games = fpsSeed.games.map((g) => ({ slug: g.slug, name: g.name }))
const index = buildSearchIndex({
  hero,
  games,
  table: seedFpsTable,
  flags: { ready: false, voucher: false },
})
const prepared = prepareSearch(index)
const search = (q: string) => searchSite(prepared, q)

describe('search index', () => {
  it('is small and carries no cost or internal model', () => {
    const json = JSON.stringify(index)
    expect(json.length).toBeLessThan(30_000)
    expect(json).not.toMatch(/cost|internalModel|margin|markup/i)
    for (const level of seed.levels) {
      for (const part of level.components) {
        if (part.internalModel !== part.publicLabel) expect(json).not.toContain(part.internalModel)
      }
    }
  })

  it('lists the 16 builds by price with their published price and the smooth builds per game', () => {
    expect(index.builds).toHaveLength(16)
    const prices = index.builds.map((b) => b.price ?? Infinity)
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)
    const fortnite = index.games.find((g) => g.slug === 'fortnite')!
    expect(fortnite.smooth.length).toBeGreaterThan(0)
    expect(fortnite.smooth.length).toBeLessThanOrEqual(5)
    for (const slug of fortnite.smooth) {
      expect(fpsFor(seedFpsTable, slug, 'fortnite', 'fullhd')!.fps).toBeGreaterThanOrEqual(60)
    }
  })

  it('links the voucher and ready pages only when their flags are on', () => {
    const off = searchPages({ ready: false, voucher: false }).map((p) => p.href)
    const on = searchPages({ ready: true, voucher: true }).map((p) => p.href)
    expect(off).not.toContain('/bon')
    expect(on).toEqual(expect.arrayContaining(['/bon', '/gotowe']))
  })
})

describe('searchSite (NAWIGACJA §5.2)', () => {
  it.each([
    ['fortn', 'game', 'fortnite'],
    ['Fortnite', 'game', 'fortnite'],
    ['cs2', 'game', 'counter-strike-2'],
    ['gta', 'game', 'gta-v'],
    ['wiedzmin', 'game', 'wiedzmin-3'],
    ['lol', 'game', 'league-of-legends'],
    ['wampir', 'build', 'wampir'],
    ['rusałka', 'build', 'rusalka'],
    ['rusalka', 'build', 'rusalka'],
    ['kikimra', 'build', 'kikimora'],
    ['dla syna', 'page', '/dla-rodzicow'],
    ['dla córki', 'page', '/dla-rodzicow'],
    ['kontakt', 'page', '/kontakt'],
  ])('„%s” → first %s %s', (query, kind, id) => {
    const result = search(query)!
    const first =
      kind === 'game'
        ? result.games[0]?.slug
        : kind === 'build'
          ? result.builds[0]?.slug
          : result.pages[0]?.href
    expect(first).toBe(id)
  })

  it('„4k” → the builds made for 4K', () => {
    const builds = search('4k')!.builds
    expect(builds.length).toBeGreaterThan(0)
    for (const b of builds) expect(b.resolution).toBe('4K')
  })

  it('„tani”, „najtańszy” → builds from the cheapest', () => {
    for (const q of ['tani', 'najtańszy komputer']) {
      const builds = search(q)!.builds
      expect(builds[0]?.slug).toBe(index.builds[0].slug)
      expect(builds.length).toBe(5)
    }
  })

  it('a game fills „Zestawy pod {grę}” with its smooth builds', () => {
    const result = search('fortnite')!
    expect(result.buildsFor?.slug).toBe('fortnite')
    expect(result.builds.map((b) => b.slug)).toEqual(result.buildsFor!.smooth)
  })

  it('nothing for nonsense, „Popularne” for an empty query', () => {
    expect(isEmpty(search('xyz')!)).toBe(true)
    expect(search('   ')).toBeNull()
    const pop = popular(index)
    expect(pop.builds.map((b) => b.slug)).toEqual(['skrzat', 'bies', 'kikimora', 'wampir'])
    expect(pop.games.map((g) => g.slug)).toEqual([
      'fortnite',
      'counter-strike-2',
      'minecraft',
      'cyberpunk-2077',
    ])
  })

  it('never more than 5 in a group', () => {
    const result = search('moc')!
    expect(result.builds.length).toBeLessThanOrEqual(5)
  })
})
