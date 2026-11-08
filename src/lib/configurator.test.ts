import { describe, expect, it } from 'vitest'

import pricingExpected from '../../tests/fixtures/pricing-expected.json'
import { compatMessage, type CompatError } from './compat'
import {
  buildMatch,
  caseMatches,
  compactFps,
  configInquiryHref,
  configWarnings,
  coolerIntro,
  decodeConfig,
  encodeConfig,
  fpsCell,
  fpsNote,
  hasHeavyGame,
  levelChangeMessage,
  matchBuild,
  OTHER_PART_MAX,
  optionStates,
  parseState,
  recommendation,
  repairConfig,
  shownGames,
  stateQuery,
  switchLevel,
  tierRows,
  CONFIGURATOR_GAMES,
  type ConfBuild,
} from './configurator'
import { fpsSeed } from '../seed/fps'
import { seed } from '../seed/offer'
import { signedZl } from './pricing/format'
import { priceFromSnapshot } from './pricing/snapshot'
import type { Config, OptionType } from './pricing/types'
import { seedCatalog } from './pricing/testing/seedCatalog'
import { seedFpsTable, seedSnapshot } from './testing/offerFromSeed'

const catalog = seedCatalog()
const offer = { levels: catalog.levels, options: catalog.options }
const builds: ConfBuild[] = pricingExpected.builds.map((b) => ({
  slug: b.slug,
  name: seed.builds.find((s) => s.slug === b.slug)!.name,
  config: b.config,
}))
const prices = seedSnapshot
const games = [...CONFIGURATOR_GAMES]
const ctx = { offer, builds, prices, games }
const label = (code: string) => seed.options.find((o) => o.code === code)?.publicLabel ?? code
const levelOf = (code: string) => catalog.levels.find((l) => l.code === code)!
const recipe = (slug: string) => builds.find((b) => b.slug === slug)!.config

/** The slot whose option breaks a rule (ADR-G002 §5): where the configurator greys it out. */
const SLOT_OF: Record<CompatError, OptionType> = {
  gpu_too_long: 'case',
  case_class_too_low: 'case',
  cooler_too_tall: 'cooler',
  no_aio_mount: 'cooler',
  requires_aio: 'cooler',
  cooler_class_too_low: 'cooler',
  ram_type: 'ram',
  ram_too_small: 'ram',
  ssd_too_small: 'ssd',
}

describe('the 11 scenarios of the pricing sheet (fixtures)', () => {
  // Money and sense: the configurator must price and grey out exactly like the sheet.
  for (const s of pricingExpected.scenarios) {
    it(s.name, () => {
      expect(priceFromSnapshot(s.config, prices)).toBe(s.price)
      expect(matchBuild(s.config, builds)?.slug ?? null).toBe(s.matchesBuild)

      const errors = s.errors as CompatError[]
      if (errors.length === 0) {
        expect(repairConfig(s.config, offer, prices)).toEqual({ config: s.config, changes: [] })
        const expectedWarnings = s.warnings.map((w) =>
          compatMessage(w as 'thick_radiator_top_only', levelOf(s.config.level)),
        )
        expect(configWarnings(s.config, offer)).toEqual(expectedWarnings)
        return
      }
      // The broken option, seen from a valid configuration of the same level, is greyed out
      // with the reason of its first broken rule.
      const slot = SLOT_OF[errors[0]!]
      const valid = repairConfig(s.config, offer, prices)!.config
      const state = optionStates(slot, valid, offer, prices).find((o) => o.code === s.config[slot])
      if (errors[0] === 'ram_type') {
        // A RAM of the other type is not listed at all: the heading names the type.
        expect(state).toBeUndefined()
        return
      }
      expect(state).toMatchObject({ disabled: true, selected: false })
      const shownErrors = errors.filter((e) => SLOT_OF[e] === slot)
      expect(state!.reason).toBe(compatMessage(shownErrors[0]!, levelOf(s.config.level)))
    })
  }
})

describe('options of a step', () => {
  it('Wampir RAM: DDR5 only, 16 GB greyed out last, surcharges against R32 (board konf-5)', () => {
    const states = optionStates('ram', recipe('wampir'), offer, prices)
    expect(states.map((s) => [s.code, s.surcharge, s.disabled])).toEqual([
      ['R32', 0, false],
      ['R32RGB', 90, false],
      ['R32WP', -30, false],
      ['R64', 3190, false],
      ['R16', -1310, true],
    ])
    expect(states.find((s) => s.code === 'R16')!.reason).toBe(
      'Za mało pamięci do tego poziomu (min. 32 GB)',
    )
    expect(states.find((s) => s.code === 'R32')!.selected).toBe(true)
  })

  it('Wampir disk: 512 GB greyed out (board konf-5)', () => {
    const states = optionStates('ssd', recipe('wampir'), offer, prices)
    expect(states.map((s) => [s.code, s.surcharge, s.disabled])).toEqual([
      ['PX1', -230, false],
      ['NM1', 0, false],
      ['NM2', 610, false],
      ['PXL512', -520, true],
    ])
    expect(states.at(-1)!.reason).toBe('Za mały dysk do tego poziomu')
  })

  it('every selectable option keeps the configuration valid and priced = recipe + surcharge', () => {
    for (const b of builds) {
      const base = priceFromSnapshot(b.config, prices)!
      for (const slot of ['case', 'cooler', 'ram', 'ssd'] as const) {
        for (const s of optionStates(slot, b.config, offer, prices)) {
          const next = { ...b.config, [slot]: s.code }
          expect(priceFromSnapshot(next, prices)).toBe(base + s.surcharge)
          expect(repairConfig(next, offer, prices)!.changes.length === 0).toBe(!s.disabled)
        }
      }
    }
  })

  it('inactive options are never offered', () => {
    const inactive = {
      ...offer,
      options: offer.options.map((o) => (o.code === 'R64' ? { ...o, active: false } : o)),
    }
    const codes = optionStates('ram', recipe('wampir'), inactive, prices).map((s) => s.code)
    expect(codes).not.toContain('R64')
  })
})

describe('level change with the choice kept (ADR-G002 §6)', () => {
  it('an unchanged build moves to the new level’s own build, without a message', () => {
    const result = switchLevel(recipe('bies'), 'P13', { offer, builds, prices })!
    expect(result.config).toEqual(recipe('wampir'))
    expect(levelChangeMessage('4K', result, label)).toBeNull()
  })

  it('16 GB → the cheapest sufficient 32 GB DDR5 (ADR example: R32WP, +1 280 zł)', () => {
    const custom: Config = { ...recipe('bies'), ssd: 'NM2' }
    const result = switchLevel(custom, 'P13', { offer, builds, prices })!
    expect(result.keptChoice).toBe(true)
    expect(result.config.case).toBe(custom.case)
    expect(result.config.ram).toBe('R32WP')
    expect(result.changes).toContainEqual({
      slot: 'ram',
      from: 'R16',
      to: 'R32WP',
      reason: 'Za mało pamięci do tego poziomu (min. 32 GB)',
      surcharge: 1280,
    })
    expect(levelChangeMessage('4K', result, label)).toContain(
      'Zachowaliśmy Twoje wybory. 4K wymaga zmian, więc dopasowaliśmy: ',
    )
    expect(levelChangeMessage('4K', result, label)?.replace(/ /g, ' ')).toContain(
      'RAM → 32 GB DDR5 6000 CL30 RGB biała (2x16) (za mało pamięci do tego poziomu (min. 32 GB), +1 280 zł)',
    )
  })

  it('nothing to change: the message says the choice was kept', () => {
    // Kikimora with a 2 TB disk → Zmora (the same tier, Radeon): everything still fits.
    const custom: Config = { ...recipe('kikimora'), ssd: 'NM2' }
    const result = switchLevel(custom, 'P07', { offer, builds, prices })!
    expect(result).toMatchObject({ keptChoice: true, changes: [] })
    expect(result.config).toEqual({ ...custom, level: 'P07' })
    expect(levelChangeMessage('2K', result, label)).toBe(
      'Zachowaliśmy Twoje wybory obudowy, chłodzenia, pamięci i dysku.',
    )
  })

  it('DDR5 → AM4 (DDR4): RAM of the right type; Wilkołak needs an AIO', () => {
    const toLicho = switchLevel({ ...recipe('wampir'), ssd: 'NM2' }, 'P02', {
      offer,
      builds,
      prices,
    })!
    expect(levelOf('P02').ramType).toBe('DDR4')
    expect(toLicho.config.ram).toBe('R32D4')
    const toWilkolak = switchLevel({ ...recipe('bies'), ssd: 'NM2' }, 'P12', {
      offer,
      builds,
      prices,
    })!
    const cooler = catalog.options.find((o) => o.code === toWilkolak.config.cooler)!
    expect(cooler.type === 'cooler' && cooler.kind).toBe('aio360')
  })

  it('from any build to any level: always a valid, priced configuration', () => {
    for (const from of builds) {
      for (const level of catalog.levels) {
        for (const start of [from.config, { ...from.config, ssd: 'NM2' }]) {
          const result = switchLevel(start, level.code, { offer, builds, prices })!
          expect(result.config.level).toBe(level.code)
          expect(repairConfig(result.config, offer, prices)!.changes).toEqual([])
          expect(priceFromSnapshot(result.config, prices)).not.toBeNull()
        }
      }
    }
  })
})

describe('ready builds', () => {
  it('16 builds: „To dokładnie …” and the price of the fixtures', () => {
    for (const b of pricingExpected.builds) {
      const match = buildMatch(b.config, builds, prices)!
      expect(match.exact).toBe(true)
      expect(match.short).toBe(`To dokładnie ${match.build.name}`)
      expect(priceFromSnapshot(b.config, prices)).toBe(b.price)
    }
  })

  it('a custom configuration names the nearest build and the difference (board texts)', () => {
    const custom: Config = { ...recipe('wampir'), ram: 'R64' }
    const match = buildMatch(custom, builds, prices)!
    // `zl()` groups thousands with a non-breaking space; compare the words.
    const plain = (text: string) => text.replace(/ /g, ' ')
    expect({ ...match, text: plain(match.text), short: plain(match.short) }).toMatchObject({
      exact: false,
      diff: 3190,
      title: 'Twoja konfiguracja na bazie: Wampir',
      text: 'Gotowy Wampir kosztuje 14 540 zł (−3 190 zł względem Twojej konfiguracji).',
      short: 'Konfiguracja własna · +3 190 zł vs Wampir',
      sideName: 'Wampir po zmianach',
    })
  })
})

describe('address', () => {
  it('k: five codes both ways; garbage is rejected', () => {
    const config = recipe('wampir')
    expect(encodeConfig(config)).toBe('P13.LB500.PL3LX.R32.NM1')
    expect(decodeConfig(encodeConfig(config))).toEqual(config)
    for (const bad of ['', 'P13.LB500', 'P13.LB500.PL3LX.R32.NM1.X', 'P13.<b>.PL3LX.R32.NM1']) {
      expect(decodeConfig(bad)).toBeNull()
    }
  })

  it('?zestaw=… for all 16 builds: the recipe, the price of the fixtures, step „poziom”', () => {
    for (const b of pricingExpected.builds) {
      const { state, changes } = parseState(new URLSearchParams({ zestaw: b.slug }), ctx)!
      expect(state.config).toEqual(b.config)
      expect(state.step).toBe('poziom')
      expect(changes).toEqual([])
      expect(priceFromSnapshot(state.config, prices)).toBe(b.price)
    }
  })

  it('round trip: stateQuery → parseState gives the same state', () => {
    const state = {
      step: 'pamiec' as const,
      monitor: 'uhd' as const,
      games: ['valorant', 'cyberpunk-2077'],
      config: { ...recipe('kikimora'), ssd: 'NM2' },
      light: 'lod' as const,
    }
    expect(parseState(new URLSearchParams(stateQuery(state)), ctx)!.state).toEqual(state)
  })

  it('no parameters: the board’s start (Wampir, 2K, three games, step 1)', () => {
    expect(parseState(new URLSearchParams(), ctx)!.state).toEqual({
      step: 'monitor',
      monitor: 'qhd',
      games: ['fortnite', 'counter-strike-2', 'cyberpunk-2077'],
      config: recipe('wampir'),
      light: null,
    })
  })

  it('unknown codes, an unknown build, prototype keys and bad values fall back safely', () => {
    for (const query of [
      'k=P99.LB500.PL3LX.R32.NM1',
      'k=P13.PL3LX.LB500.R32.NM1',
      'k=constructor.LB500.PL3LX.R32.NM1',
      'zestaw=__proto__',
      'monitor=8k&krok=koniec&swiatlo=neon&gry=nie-ma,fortnite,fortnite',
    ]) {
      const { state } = parseState(new URLSearchParams(query), ctx)!
      expect(state.config).toEqual(recipe('wampir'))
      expect(state.monitor).toBe('qhd')
      expect(state.light).toBeNull()
      expect(['monitor', 'poziom']).toContain(state.step)
    }
    expect(
      parseState(new URLSearchParams('gry=nie-ma,fortnite,fortnite'), ctx)!.state.games,
    ).toEqual(['fortnite'])
    expect(parseState(new URLSearchParams('gry='), ctx)!.state.games).toEqual([])
  })

  it('an inactive option in the address falls back to the start', () => {
    const inactive = {
      ...ctx,
      offer: {
        ...offer,
        options: offer.options.map((o) => (o.code === 'R64' ? { ...o, active: false } : o)),
      },
    }
    const k = encodeConfig({ ...recipe('wampir'), ram: 'R64' })
    expect(parseState(new URLSearchParams({ k }), inactive)!.state.config).toEqual(recipe('wampir'))
  })

  it('a valid but incompatible configuration is repaired and the changes are reported', () => {
    const s = pricingExpected.scenarios.find((x) => x.name === 'Wampir z 16 GB RAM')!
    const { state, changes } = parseState(new URLSearchParams({ k: encodeConfig(s.config) }), ctx)!
    expect(state.config.ram).toBe('R32WP')
    expect(changes.map((c) => c.slot)).toEqual(['ram'])
  })

  it('inquiry link: codes, light and the other-part text (trimmed, capped)', () => {
    expect(configInquiryHref(recipe('wampir'), null)).toBe('/zapytanie?k=P13.LB500.PL3LX.R32.NM1')
    const href = configInquiryHref(recipe('wampir'), 'lod', `  Lian Li O11 ${'x'.repeat(400)}`)
    const params = new URL(href, 'https://example.test').searchParams
    expect(params.get('swiatlo')).toBe('lod')
    expect(params.get('inne')!.length).toBe(OTHER_PART_MAX)
    expect(params.get('inne')!.startsWith('Lian Li O11')).toBe(true)
  })
})

describe('step 1: recommendation (board RECO)', () => {
  const kinds = Object.fromEntries(fpsSeed.games.map((g) => [g.slug, g.kind]))

  it('e-sport only vs a demanding game, per monitor', () => {
    expect(hasHeavyGame(['fortnite', 'counter-strike-2'], kinds)).toBe(false)
    expect(hasHeavyGame(['fortnite', 'elden-ring'], kinds)).toBe(true)
    expect(recommendation('fullhd', false).build).toBe('licho')
    expect(recommendation('fullhd', true).build).toBe('strzyga')
    expect(recommendation('qhd', false).build).toBe('kikimora')
    expect(recommendation('qhd', true)).toEqual({
      build: 'baba-jaga',
      why: 'Masz na liście gry z wymagającą grafiką, monitor 2K. Ten poziom da płynną grę bez przepłacania.',
    })
    expect(recommendation('uhd', false).build).toBe('wampir')
    expect(recommendation('uhd', true).build).toBe('weles')
  })

  it('every recommended build exists', () => {
    for (const monitor of ['fullhd', 'qhd', 'uhd'] as const) {
      for (const heavy of [false, true]) {
        expect(builds.map((b) => b.slug)).toContain(recommendation(monitor, heavy).build)
      }
    }
  })
})

describe('step 2: tier rows and FPS', () => {
  const fps = compactFps(seedFpsTable, games)
  const levels = seed.levels.map((l) => ({ code: l.code, tier: l.tier, build: l.leadBuild }))
  const rows = tierRows({
    levels,
    current: 'P13',
    games: shownGames(['fortnite', 'counter-strike-2', 'cyberpunk-2077']),
    monitor: 'qhd',
    fps,
    levelFrom: prices.levelFrom,
  })

  it('nine rows, variants in offer order, the chosen level shown', () => {
    expect(rows).toHaveLength(9)
    expect(rows[6]).toMatchObject({ tier: 7, levels: ['P12', 'P13'], shown: 'P13', selected: true })
    expect(rows[4]).toMatchObject({ levels: ['P06', 'P07', 'P08'], shown: 'P06', selected: false })
    expect(rows[0]!.from).toBe(pricingExpected.priceFrom.P01)
    expect(rows[8]!.upgrade).toBe('Najmocniejszy komputer, jaki składamy')
  })

  it('„Poziom wyżej”: price from level_from, gain from the shown games’ FPS', () => {
    const from = (code: string) => prices.levelFrom[code]!
    const sum = (build: string) =>
      ['fortnite', 'counter-strike-2', 'cyberpunk-2077'].reduce(
        (a, g) => a + fpsCell(fps, build, g, 'qhd')!.fps,
        0,
      )
    const gain = Math.round((sum('licho') / sum('skrzat') - 1) * 100)
    expect(rows[0]!.upgrade).toBe(
      `Poziom wyżej: ${signedZl(from('P02') - from('P01'))} za ok. +${gain}% klatek w Twoich grach`,
    )
  })

  it('FPS source note (board monitorNote)', () => {
    expect(
      fpsNote(
        [
          { fps: 1, kind: 'm' },
          { fps: 1, kind: 'r' },
        ],
        'qhd',
      ),
    ).toBe('monitor 2K, najwyższe ustawienia, bez skalowania; wyniki z testów niezależnych')
    expect(fpsNote([{ fps: 1, kind: 'm' }, { fps: 1, kind: 'e' }, null], 'uhd')).toBe(
      'monitor 4K, najwyższe ustawienia, bez skalowania; 1 z testów, 1 szacunek',
    )
    expect(fpsNote([{ fps: 1, kind: 'e' }], 'fullhd')).toBe(
      'monitor FullHD, najwyższe ustawienia, bez skalowania; szacunek (brak testu tej gry z naszą kartą)',
    )
  })

  it('the compact table keeps only the configurator’s games and no source texts', () => {
    expect(Object.keys(fps).every((k) => games.some((g) => k.includes(`|${g}|`)))).toBe(true)
    expect(JSON.stringify(fps)).not.toContain('sourceLabel')
    expect(fpsCell(fps, 'wampir', 'constructor', 'qhd')).toBeNull()
  })

  it('no game picked: the board’s two games', () => {
    expect(shownGames([])).toEqual(['counter-strike-2', 'cyberpunk-2077'])
    expect(shownGames(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c'])
  })
})

describe('steps 3–4: filters and texts', () => {
  it('case filters by description words and colour (board CF)', () => {
    expect(
      caseMatches('pan', { description: 'szkło panoramiczne, 4× ARGB', color: 'czarny' }),
    ).toBe(true)
    expect(caseMatches('mesh', { description: 'siatka z przodu, ARGB', color: 'czarny' })).toBe(
      true,
    )
    expect(caseMatches('white', { description: 'biała', color: 'biały' })).toBe(true)
    expect(caseMatches('white', { description: null, color: null })).toBe(false)
    expect(caseMatches('all', { description: null, color: null })).toBe(true)
  })

  it('cooler intro (board coolIntro)', () => {
    expect(
      coolerIntro(levelOf('P13'), {
        label: 'be quiet! Light Base 500 LX czarna',
        coolerMaxMm: 185,
        aio360: 'top_only',
      }),
    ).toBe(
      'Pokazujemy tylko chłodzenia, które pasują do obudowy be quiet! Light Base 500 LX czarna (mieści AIO 360, cooler do 185 mm).',
    )
    expect(coolerIntro({ requiresAio: true }, { label: 'x', coolerMaxMm: 1, aio360: 'yes' })).toBe(
      'Ten procesor potrzebuje chłodzenia wodnego 360 mm.',
    )
  })
})

describe('unpublished or inactive offer (review G10)', () => {
  const withoutLevel = (code: string) => {
    const level = { ...prices.level }
    delete level[code]
    return { ...prices, level }
  }

  it('a level without a published price is never reached by a level change', () => {
    const unpriced = withoutLevel('P13')
    expect(switchLevel(recipe('bies'), 'P13', { offer, builds, prices: unpriced })).toBeNull()
    expect(
      switchLevel({ ...recipe('bies'), ssd: 'NM2' }, 'P13', { offer, builds, prices: unpriced }),
    ).toBeNull()
    expect(repairConfig(recipe('wampir'), offer, unpriced)).toBeNull()
  })

  it('an unsellable recipe is not taken: the choice is kept and repaired instead', () => {
    const inactive = {
      ...offer,
      options: offer.options.map((o) => (o.code === 'LB500' ? { ...o, active: false } : o)),
    }
    const result = switchLevel(recipe('bies'), 'P13', { offer: inactive, builds, prices })!
    expect(result.keptChoice).toBe(true)
    expect(result.config.case).not.toBe('LB500')
  })

  it('the start falls back to the first sellable build; none → null', () => {
    const { state } = parseState(new URLSearchParams(), { ...ctx, prices: withoutLevel('P13') })!
    expect(state.config.level).not.toBe('P13')
    expect(priceFromSnapshot(state.config, withoutLevel('P13'))).not.toBeNull()
    expect(parseState(new URLSearchParams(), { ...ctx, builds: [] })).toBeNull()
    expect(
      parseState(new URLSearchParams(), { ...ctx, prices: { ...prices, level: {} } }),
    ).toBeNull()
  })

  it('no FPS number at all: the note names no source', () => {
    expect(fpsNote([null, null], 'qhd')).toBe('monitor 2K, najwyższe ustawienia, bez skalowania')
  })

  it('prototype keys are not games', () => {
    expect(hasHeavyGame(['constructor', '__proto__'], { fortnite: 'esport' })).toBe(false)
  })

  it('the other-part text is cut by characters, not halves of an emoji', () => {
    const href = configInquiryHref(recipe('wampir'), null, `${'a'.repeat(OTHER_PART_MAX - 1)}😀😀`)
    const inne = new URL(href, 'https://example.test').searchParams.get('inne')!
    expect(Array.from(inne)).toHaveLength(OTHER_PART_MAX)
    expect(inne.endsWith('😀')).toBe(true)
  })
})
