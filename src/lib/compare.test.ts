import { describe, expect, it } from 'vitest'

import { fpsSeed } from '../seed/fps'
import { seed } from '../seed/offer'
import {
  compareQuery,
  compareView,
  gainText,
  nextBuild,
  parseCompare,
  sizeOf,
  slotOption,
  specRows,
  type CompareBuild,
  type CompareData,
  type CompareState,
} from './compare'
import { fpsFor, RESOLUTIONS } from './fps'
import { buildHero, TIER_HINTS } from './home'
import {
  seedBuilds,
  seedFpsTable,
  seedLevels,
  seedOptions,
  seedSnapshot,
} from './testing/offerFromSeed'

// The comparison data the way `loadCompare()` builds it, from the seed.
const hero = buildHero({
  builds: seedBuilds,
  levels: seedLevels,
  options: seedOptions,
  snapshot: seedSnapshot,
  fps: seedFpsTable,
})
const creature = new Map(seed.creatures.map((c) => [c.slug, c]))
const recipe = new Map(seed.builds.map((b) => [b.slug, b]))
const builds: CompareBuild[] = [...hero.builds]
  .sort((a, b) => a.price! - b.price!)
  .map((b, rank) => {
    const r = recipe.get(b.slug)!
    const c = creature.get(r.creature)!
    const level = seed.levels.find((l) => l.code === r.level)!
    return {
      slug: b.slug,
      name: b.name,
      key: b.key,
      accusative: b.accusative,
      genitive: c.genitive,
      epithet: b.epithet,
      giftTitle: c.giftTitle,
      gift: c.gift,
      tierRoman: b.tierRoman,
      tierLabel: b.tierLabel,
      price: b.price!,
      rank,
      photo: b.photo,
      cpu: b.cpu,
      gpu: b.gpu,
      ram: b.ram,
      disk: b.disk,
      psu: level.components.find((p) => p.role === 'psu')?.publicLabel ?? null,
      cooler: seed.options.find((o) => o.code === r.cooler)?.publicLabel ?? null,
      look: b.look,
      monitor: TIER_HINTS[b.tier]!,
    }
  })
const games = fpsSeed.games.map((g) => ({
  slug: g.slug,
  name: g.name,
  kind: g.kind,
  fpsCap: g.fpsCap,
}))
const data: CompareData = {
  builds,
  games,
  fps: { fullhd: [], qhd: [], uhd: [] },
  kinds: { fullhd: [], qhd: [], uhd: [] },
}
for (const r of RESOLUTIONS) {
  for (const g of games) {
    const rows = builds.map((b) => fpsFor(seedFpsTable, b.slug, g.slug, r))
    data.fps[r].push(rows.map((x) => x?.fps ?? null))
    data.kinds[r].push(rows.map((x) => x?.kind ?? '-').join(''))
  }
}

const board: CompareState = {
  slots: ['baba-jaga', 'wampir', 'weles'],
  game: 'cyberpunk-2077',
  resolution: 'qhd',
  hz: 144,
  diff: false,
}
/** Amounts use a non-breaking space (`zl()`); tests compare with a plain one. */
const plain = (text: string | null) => text?.replace(/ /g, ' ') ?? null

const view = (state: Partial<CompareState>, all = false) =>
  compareView(data, { ...board, ...state }, all)!

describe('address', () => {
  it('without parameters: the board view', () => {
    expect(parseCompare({}, data)).toEqual(board)
  })

  it('known builds only, no repeats, at most three', () => {
    expect(parseCompare({ z: 'wampir,nope,wampir,perun,skrzat,licho' }, data).slots).toEqual([
      'wampir',
      'perun',
      'skrzat',
    ])
  })

  it('one build (link from a build page) gets the next dearer one', () => {
    const slots = parseCompare({ z: 'wampir' }, data).slots
    expect(slots[0]).toBe('wampir')
    const next = builds.find((b) => b.slug === slots[1])!
    expect(next.rank).toBe(builds.find((b) => b.slug === 'wampir')!.rank + 1)
  })

  it('the dearest build alone gets any other one', () => {
    expect(nextBuild(['perun'], builds)).not.toBe('perun')
  })

  it('unknown game, resolution and refresh rate fall back', () => {
    const s = parseCompare({ gra: 'x', rozdz: '8k', hz: '75' }, data)
    expect([s.game, s.resolution, s.hz]).toEqual(['cyberpunk-2077', 'qhd', 144])
  })

  it('round-trips, with „Tylko różnice”', () => {
    const state: CompareState = {
      ...board,
      slots: ['licho', 'perun'],
      hz: 240,
      resolution: 'uhd',
      diff: true,
    }
    const query = compareQuery(state)
    expect(query).toBe('?z=licho,perun&gra=cyberpunk-2077&rozdz=4k&hz=240&roznice=1')
    expect(parseCompare(new URLSearchParams(query.slice(1)), data)).toEqual(state)
  })
})

describe('verdict and steps (board example: Cyberpunk 2077, 2K, 144 Hz)', () => {
  const v = view({})

  it('Baba Jaga is enough, Weles has most frames', () => {
    expect(v.numbers.map((n) => n?.fps)).toEqual([105, 126, 143])
    expect(v.verdict.title).toBe('Baba Jaga wystarczy')
    expect(v.verdict.text).toBe('Baba Jaga da 105 klatek, czyli płynna gra, powyżej 60 klatek.')
    expect(plain(v.verdict.more)).toBe(
      'Weles da o 36% więcej klatek, za dopłatę 5 450 zł. Warto, jeśli chcesz zapasu na kolejne premiery albo wyższą rozdzielczość.',
    )
    expect(v.badges.map((b) => b?.text ?? null)).toEqual(['Wystarczy', null, 'Najwięcej klatek'])
    expect(v.top).toBe(2)
  })

  it('„Z {A} na {B}” in price order', () => {
    expect(
      v.steps.map((s) => plain(`Z ${s.from} na ${s.to} ${s.gain} za dopłatę ${s.extra}`)),
    ).toEqual([
      'Z Baby Jagi na Wampira +20% klatek za dopłatę 2 890 zł',
      'Z Wampira na Welesa +13% klatek za dopłatę 2 560 zł',
    ])
  })

  it('order of the slots does not change the steps', () => {
    expect(view({ slots: ['weles', 'baba-jaga', 'wampir'] }).steps).toEqual(v.steps)
  })

  it('the only one that copes', () => {
    const one = view({ slots: ['skrzat', 'perun'], game: 'cyberpunk-2077', resolution: 'uhd' })
    expect(one.verdict.title).toBe('Perun to dobry wybór')
    expect(one.badges[1]?.text).toBe('Jedyny, który da radę')
  })

  it('e-sport is measured against the monitor', () => {
    const e = view({
      slots: ['skrzat', 'licho'],
      game: 'counter-strike-2',
      resolution: 'fullhd',
      hz: 240,
    })
    const target = e.numbers.some((n) => (n?.fps ?? 0) >= 240)
    expect(e.verdict.tone).toBe(target ? 'ok' : 'low')
    if (target) expect(e.verdict.text).toMatch(/tyle, ile pokaże Twój monitor 240 Hz\.$/)
  })

  it('not enough power: suggests the cheapest build that copes', () => {
    const low = view({ slots: ['skrzat', 'licho'], game: 'cyberpunk-2077', resolution: 'uhd' })
    expect(low.verdict.title).toBe('Za mało mocy na ten monitor')
    expect(low.verdict.suggest).not.toBeNull()
    const s = builds.find((b) => b.slug === low.verdict.suggest)!
    // Nothing cheaper (outside the slots) reaches 60.
    for (const b of builds.filter(
      (x) => x.rank < s.rank && !['skrzat', 'licho'].includes(x.slug),
    )) {
      expect(fpsFor(seedFpsTable, b.slug, 'cyberpunk-2077', 'uhd')!.fps).toBeLessThan(60)
    }
    expect(low.verdict.more).toMatch(/^Do pełnej płynności w Cyberpunk 2077 w 4K wystarczy /)
    expect(low.verdict.suggestName).toBe(s.accusative)
  })

  it('a capped game: no badges, no steps', () => {
    const c = view({ game: 'elden-ring' })
    expect(c.verdict.title).toBe('Tu dopłata nic nie zmieni')
    expect(c.badges.every((b) => b === null)).toBe(true)
    expect(c.steps).toEqual([])
    expect(c.top).toBeNull()
  })
})

describe('verdict corner cases (review G11)', () => {
  it('nobody reaches 60 in a heavy game: the text names 60, not the monitor', () => {
    // Without the dearer builds in the data, no suggestion is possible.
    const cheap = {
      ...data,
      builds: data.builds.filter((b) => ['skrzat', 'licho'].includes(b.slug)),
    }
    const idx = (slug: string) => data.builds.findIndex((b) => b.slug === slug)
    const keep = [idx('skrzat'), idx('licho')]
    const pickCols = (rows: (number | null)[][]) => rows.map((r) => keep.map((k) => r[k] ?? null))
    const trimmed: CompareData = {
      ...cheap,
      fps: {
        fullhd: pickCols(data.fps.fullhd),
        qhd: pickCols(data.fps.qhd),
        uhd: pickCols(data.fps.uhd),
      },
      kinds: {
        fullhd: data.kinds.fullhd.map((k) => keep.map((i) => k[i]).join('')),
        qhd: data.kinds.qhd.map((k) => keep.map((i) => k[i]).join('')),
        uhd: data.kinds.uhd.map((k) => keep.map((i) => k[i]).join('')),
      },
    }
    const v = compareView(
      trimmed,
      { ...board, slots: ['skrzat', 'licho'], resolution: 'uhd', hz: 144 },
      false,
    )!
    expect(v.verdict.suggest).toBeNull()
    expect(v.verdict.more).toMatch(/^Tu nawet Perun nie da pełnych 60 klatek\./)
  })

  it('no numbers at all: no promise, even for a capped game', () => {
    const empty: CompareData = {
      ...data,
      fps: {
        fullhd: data.fps.fullhd.map((r) => r.map(() => null)),
        qhd: data.fps.qhd.map((r) => r.map(() => null)),
        uhd: data.fps.uhd.map((r) => r.map(() => null)),
      },
    }
    const v = compareView(empty, { ...board, game: 'elden-ring' }, false)!
    expect(v.verdict.title).toBe('Brak wyników dla tej gry')
    expect(v.verdict.text).not.toMatch(/płynne/)
  })
})

describe('chart and matrix', () => {
  it('positions on a scale 12% above the highest of numbers, monitor and 60', () => {
    const v = view({})
    const scale = 144 * 1.12 > 143 * 1.12 ? 144 * 1.12 : 143 * 1.12
    expect(v.chart.points[2]).toBeCloseTo((143 / scale) * 100, 1)
    expect(v.chart.line60).toBeCloseTo((60 / scale) * 100, 1)
    expect(view({ hz: 60 }).chart.lineHz).toBeNull()
  })

  it('popular games plus the picked one, or all 33', () => {
    expect(view({}).matrix.map((r) => r.game)).toHaveLength(8)
    expect(view({ game: 'elden-ring' }).matrix.map((r) => r.game)).toContain('elden-ring')
    expect(view({}, true).matrix).toHaveLength(33)
  })

  it('cell colours: below 60 / smooth / uses the monitor / capped', () => {
    const all = view({ slots: ['skrzat', 'perun'], resolution: 'uhd' }, true)
    for (const row of all.matrix) {
      for (const cell of row.cells) {
        const v = Number(cell.value)
        if (cell.tone === 'cap') expect(row.game).toBe('elden-ring')
        else if (cell.tone === 'full') expect(v).toBeGreaterThanOrEqual(144)
        else if (cell.tone === 'ok') expect(v >= 60 && v < 144).toBe(true)
        else if (cell.tone === 'low') expect(v).toBeLessThan(60)
        expect(cell.kind).not.toBeNull()
      }
    }
  })
})

describe('parts table', () => {
  const pick = (...slugs: string[]) => slugs.map((s) => builds.find((b) => b.slug === s)!)

  it('marks differences and the best power level and sizes', () => {
    const rows = specRows(pick('baba-jaga', 'wampir', 'weles'), false)
    const row = (label: string) => rows.find((r) => 'label' in r && r.label === label)!
    const level = row('Poziom mocy')
    expect('values' in level && level.values.map((v) => v.tone)).toEqual(['dif', 'dif', 'dif best'])
    const warranty = row('Gwarancja')
    expect('same' in warranty && warranty.same).toBe(true)
  })

  it('„Tylko różnice” hides equal rows and groups left empty', () => {
    const rows = specRows(pick('baba-jaga', 'wampir'), true)
    const group = rows.find((r) => 'group' in r && r.group === 'W cenie każdego')!
    expect(group.hidden).toBe(true)
    expect(rows.filter((r) => 'label' in r && !r.hidden).every((r) => 'same' in r && !r.same)).toBe(
      true,
    )
  })

  it('sizes compare GB and TB', () => {
    expect(sizeOf('2 TB NVMe')).toBe(2000)
    expect(sizeOf('512 GB NVMe')).toBe(512)
    expect(sizeOf('zasilacz 850 W')).toBe(850)
  })

  it('texts', () => {
    expect(gainText(20)).toBe('+20% klatek')
    expect(gainText(-3)).toBe('-3% klatek')
    expect(plain(slotOption(builds.find((b) => b.slug === 'baba-jaga')!))).toBe(
      'Baba Jaga, Moc VI, 11 650 zł',
    )
  })
})
