import { describe, expect, it } from 'vitest'

import { fpsSeed } from '../seed/fps'
import { buildFpsTable, fpsFor, RESOLUTIONS, type FpsResult, type Resolution } from './fps'
import {
  firstTierWithRam,
  gameFaq,
  gameJsonLd,
  gameLead,
  hasRequirements,
  parsePicker,
  pickerQuery,
  picksTable,
  pickThree,
  ramGb,
  smoothText,
  SMOOTH_FPS,
  STEP_UP,
  type GameInfo,
  type PickerGame,
} from './games'
import { buildHero } from './home'
import {
  seedBuilds,
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
const games: PickerGame[] = fpsSeed.games.map((g) => ({
  slug: g.slug,
  name: g.name,
  kind: g.kind,
  fpsCap: g.fpsCap,
  settingNote: null,
}))
const game = (slug: string) => games.find((g) => g.slug === slug)!
const price = new Map(hero.builds.map((b) => [b.slug, b.price!]))

const row = (build: string, fps: number, resolution: Resolution = 'qhd'): FpsResult => ({
  build,
  game: 'g',
  resolution,
  fps,
  kind: 'm',
  sourceLabel: 'test',
  sourceUrl: null,
  setting: 'ultra',
  measuredAt: null,
})
const aaa: PickerGame = { slug: 'g', name: 'Gra', kind: 'aaa', fpsCap: null, settingNote: null }
const line = (prices: number[]) => prices.map((p, i) => ({ slug: `b${i}`, tier: i + 1, price: p }))

describe('pickThree (spec. §8)', () => {
  it('picks the cheapest smooth one, then ≥ 1.25× twice', () => {
    const builds = line([1000, 2000, 3000, 4000, 5000])
    const table = buildFpsTable([
      row('b0', 50),
      row('b1', 62),
      row('b2', 70),
      row('b3', 80),
      row('b4', 120),
    ])
    expect(pickThree(builds, table, aaa, 'qhd').map((p) => [p.tag, p.slug, p.fps])).toEqual([
      ['Najtaniej płynnie', 'b1', 62],
      ['Złoty środek', 'b3', 80],
      ['Z zapasem', 'b4', 120],
    ])
  })

  it('falls back to the dearest smooth build when no one has 1.25× more', () => {
    const builds = line([1000, 2000, 3000])
    const table = buildFpsTable([row('b0', 100), row('b1', 110), row('b2', 115)])
    expect(pickThree(builds, table, aaa, 'qhd').map((p) => [p.tag, p.slug])).toEqual([
      ['Najtaniej płynnie', 'b0'],
      ['Złoty środek', 'b2'],
    ])
  })

  it('shows only the build with most frames as „Z zapasem” when nobody reaches 60', () => {
    const builds = line([1000, 2000, 3000])
    const table = buildFpsTable([row('b0', 20), row('b1', 40), row('b2', 55)])
    expect(pickThree(builds, table, aaa, 'qhd')).toEqual([
      { tag: 'Z zapasem', slug: 'b2', fps: 55, kind: 'm' },
    ])
  })

  it('a capped game gets only the cheapest smooth build', () => {
    const builds = line([1000, 2000, 3000])
    const table = buildFpsTable([row('b0', 60), row('b1', 60), row('b2', 60)])
    const capped: PickerGame = { ...aaa, kind: 'capped', fpsCap: 60 }
    expect(pickThree(builds, table, capped, 'qhd').map((p) => p.slug)).toEqual(['b0'])
  })

  it('skips builds without a price or without a number', () => {
    const builds = [
      { slug: 'b0', tier: 1, price: null },
      { slug: 'b1', tier: 2, price: 2000 },
      { slug: 'b2', tier: 3, price: 3000 },
    ]
    const table = buildFpsTable([row('b0', 90), row('b1', 70)])
    expect(pickThree(builds, table, aaa, 'qhd').map((p) => p.slug)).toEqual(['b1'])
    expect(pickThree(builds, {}, aaa, 'qhd')).toEqual([])
  })

  it('holds the rule for every game and resolution of the seed', () => {
    for (const g of games) {
      for (const resolution of RESOLUTIONS) {
        const picks = pickThree(hero.builds, seedFpsTable, g, resolution)
        expect(picks.length, `${g.slug} ${resolution}`).toBeGreaterThan(0)
        expect(new Set(picks.map((p) => p.slug)).size).toBe(picks.length)
        for (const p of picks) {
          expect(p.fps).toBe(fpsFor(seedFpsTable, p.slug, g.slug, resolution)?.fps)
        }
        // Prices strictly rise along the cards.
        for (let i = 1; i < picks.length; i++) {
          expect(price.get(picks[i]!.slug)!).toBeGreaterThan(price.get(picks[i - 1]!.slug)!)
        }
        if (picks[0]!.tag === 'Najtaniej płynnie') {
          expect(picks[0]!.fps).toBeGreaterThanOrEqual(SMOOTH_FPS)
          // Nothing cheaper is smooth.
          const cheaper = hero.builds.filter((b) => b.price! < price.get(picks[0]!.slug)!)
          for (const b of cheaper) {
            expect(fpsFor(seedFpsTable, b.slug, g.slug, resolution)?.fps ?? 0).toBeLessThan(
              SMOOTH_FPS,
            )
          }
        }
      }
    }
  })

  it('Cyberpunk 2077 in 2K: three cards, each step ≥ 1.25× or the dearest smooth one', () => {
    const picks = pickThree(hero.builds, seedFpsTable, game('cyberpunk-2077'), 'qhd')
    expect(picks.map((p) => p.tag)).toEqual(['Najtaniej płynnie', 'Złoty środek', 'Z zapasem'])
    expect(picks[1]!.fps).toBeGreaterThanOrEqual(STEP_UP * picks[0]!.fps)
  })

  it('Elden Ring (capped) shows one card', () => {
    const picks = pickThree(hero.builds, seedFpsTable, game('elden-ring'), 'qhd')
    expect(picks).toHaveLength(1)
  })

  it('picksTable has a list for every game and resolution', () => {
    const table = picksTable(hero, games, seedFpsTable)
    for (const r of RESOLUTIONS) expect(table[r]).toHaveLength(games.length)
  })
})

describe('texts', () => {
  it('smoothText', () => {
    expect(smoothText(60)).toBe('płynnie')
    expect(smoothText(59)).toBe('poniżej 60')
  })

  it('lead: the game sentence goes first, the template always follows', () => {
    expect(gameLead({ intro: null })).toMatch(/^Sprawdź, ile klatek/)
    expect(gameLead({ intro: ' Night City jest ciężkie. ' })).toBe(
      'Night City jest ciężkie. Sprawdź, ile klatek da każdy nasz poziom mocy w FullHD, 2K i 4K, i który komputer wystarczy na Twój monitor.',
    )
  })

  it('requirements count only with a level, a source and a date', () => {
    const empty = { min: null, recommended: null, max: null, source: null, checkedAt: null }
    expect(hasRequirements(empty)).toBe(false)
    expect(hasRequirements({ ...empty, min: 'GTX 1060' })).toBe(false)
    expect(
      hasRequirements({ ...empty, min: 'GTX 1060', source: 'https://x', checkedAt: '2026-10-01' }),
    ).toBe(true)
  })

  it('RAM tier comes from the offer', () => {
    expect(ramGb('32 GB DDR5 6000 CL30')).toBe(32)
    expect(ramGb(null)).toBeNull()
    const tier = firstTierWithRam(hero, 32)
    expect(tier).not.toBeNull()
    const lead = hero.tiers.find((t) => t.roman === tier)!.lead
    expect(ramGb(hero.builds.find((b) => b.slug === lead)!.ram)).toBeGreaterThanOrEqual(32)
  })

  it('FAQ: three questions for a heavy game, two for e-sport and capped', () => {
    const info = (slug: string): GameInfo => ({
      ...game(slug),
      intro: null,
      setting: 'ultra',
      requirements: { min: null, recommended: null, max: null, source: null, checkedAt: null },
    })
    const cyber = gameFaq(info('cyberpunk-2077'), hero)
    expect(cyber.map((q) => q.question)).toEqual([
      'Czy włączyć skalowanie DLSS albo FSR?',
      'Ile pamięci RAM potrzeba?',
      'Czy da się grać z ray tracingiem?',
    ])
    expect(cyber[0]!.answer).toMatch(/^W Cyberpunk 2077 tak, zwłaszcza w 2K i 4K\./)
    expect(gameFaq(info('counter-strike-2'), hero)).toHaveLength(2)
    expect(gameFaq(info('elden-ring'), hero)[0]!.answer).toMatch(/blokadę 60 klatek/)
  })

  it('JSON-LD: breadcrumbs and FAQ with absolute URLs', () => {
    const [crumbs, faq] = gameJsonLd({
      siteUrl: 'https://prokomgaming.pl',
      slug: 'gta-v',
      name: 'GTA V',
      faq: [{ question: 'Q?', answer: 'A.' }],
    }) as [Record<string, unknown>, Record<string, unknown>]
    expect(JSON.stringify(crumbs)).toContain('https://prokomgaming.pl/komputer-do/gta-v')
    expect(faq['@type']).toBe('FAQPage')
  })
})

describe('address', () => {
  it('parses known values and falls back otherwise', () => {
    expect(parsePicker({ gra: 'gta-v', rozdz: '4k' }, games)).toEqual({
      game: 'gta-v',
      resolution: 'uhd',
    })
    expect(parsePicker(new URLSearchParams('gra=nope&rozdz=8k'), games)).toEqual({
      game: 'cyberpunk-2077',
      resolution: 'qhd',
    })
  })

  it('round-trips', () => {
    const state = { game: 'elden-ring', resolution: 'fullhd' as const }
    expect(parsePicker(new URLSearchParams(pickerQuery(state).slice(1)), games)).toEqual(state)
  })
})
