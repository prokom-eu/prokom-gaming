import { describe, expect, it } from 'vitest'

import {
  KIND_PRIORITY,
  RESOLUTIONS,
  barPercent,
  buildFpsTable,
  fpsFor,
  fpsListRows,
  fpsRows,
  initialResolution,
  fpsText,
  pickResult,
  sourceOf,
  type FpsKind,
  type FpsResult,
} from './fps'

const row = (kind: FpsKind, fps: number, extra: Partial<FpsResult> = {}): FpsResult => ({
  build: 'wampir',
  game: 'counter-strike-2',
  resolution: 'qhd',
  fps,
  kind,
  sourceLabel: `źródło ${kind}`,
  sourceUrl: kind === 'e' ? null : 'https://example.test/',
  setting: 'najwyższe ustawienia, natywnie',
  measuredAt: kind === 'p' ? '2026-11-20T10:00:00.000Z' : null,
  ...extra,
})

describe('pickResult — priority p > m > r > e (ADR-G004 §5)', () => {
  it('keeps the documented order', () => {
    expect(KIND_PRIORITY).toEqual(['p', 'm', 'r', 'e'])
  })

  // Every pair of kinds, in both input orders: the higher-priority kind always wins.
  for (const [i, better] of KIND_PRIORITY.entries()) {
    for (const worse of KIND_PRIORITY.slice(i + 1)) {
      it(`${better} wins over ${worse}`, () => {
        const a = row(better, 100)
        const b = row(worse, 200)
        expect(pickResult([a, b])).toBe(a)
        expect(pickResult([b, a])).toBe(a)
      })
    }
  }

  it('all four kinds at once: the measurement wins, whatever the order', () => {
    const rows = [row('e', 1), row('r', 2), row('p', 3), row('m', 4)]
    expect(pickResult(rows)?.kind).toBe('p')
    expect(pickResult([...rows].reverse())?.kind).toBe('p')
  })

  it('the newest measurement wins over older ones', () => {
    const old = row('p', 150, { measuredAt: '2026-11-21T10:00:00.000Z' })
    const newest = row('p', 160, { measuredAt: '2026-12-05T08:00:00.000Z' })
    const older = row('p', 140, { measuredAt: '2026-11-20T10:00:00.000Z' })
    expect(pickResult([old, newest, older])).toBe(newest)
    expect(pickResult([older, old, newest])).toBe(newest)
  })

  it('no rows → null (the site shows nothing, never a made-up number)', () => {
    expect(pickResult([])).toBeNull()
  })
})

describe('buildFpsTable / fpsFor', () => {
  const rows = [
    row('m', 362),
    row('p', 371),
    row('e', 185, { game: 'fortnite' }),
    row('m', 520, { resolution: 'fullhd' }),
    row('r', 90, { build: 'skrzat' }),
  ]
  const table = buildFpsTable(rows)

  it('one number per build × game × resolution, chosen by priority', () => {
    expect(fpsFor(table, 'wampir', 'counter-strike-2', 'qhd')?.fps).toBe(371)
    expect(fpsFor(table, 'wampir', 'counter-strike-2', 'fullhd')?.fps).toBe(520)
    expect(fpsFor(table, 'wampir', 'fortnite', 'qhd')?.kind).toBe('e')
    expect(fpsFor(table, 'skrzat', 'counter-strike-2', 'qhd')?.fps).toBe(90)
    expect(Object.keys(table)).toHaveLength(4)
  })

  it('missing data → null', () => {
    expect(fpsFor(table, 'wampir', 'counter-strike-2', 'uhd')).toBeNull()
    expect(fpsFor(table, 'perun', 'fortnite', 'qhd')).toBeNull()
  })

  it('the table is plain JSON, so a server component can pass it to the browser', () => {
    expect(JSON.parse(JSON.stringify(table))).toEqual(table)
  })
})

describe('sourceOf — label and colour group (ADR-G004 §2, ADR-G003 §2)', () => {
  it('maps every kind', () => {
    expect(sourceOf('p')).toEqual({ label: 'zmierzone w PRO-KOM', tone: 'pk' })
    expect(sourceOf('m')).toEqual({ label: 'test niezależny', tone: 'ind' })
    expect(sourceOf('r')).toEqual({ label: 'przeliczone z testów', tone: 'ind' })
    expect(sourceOf('e')).toEqual({ label: 'szacunek', tone: 'est' })
  })
})

describe('bar and text (board Zestaw)', () => {
  const esport = { kind: 'esport', fpsCap: null } as const
  const aaa = { kind: 'aaa', fpsCap: null } as const
  const capped = { kind: 'capped', fpsCap: 60 } as const

  it('esport bars are scaled to 700 FPS, others to 200, capped games to their cap', () => {
    expect(barPercent(350, esport)).toBe(50)
    expect(barPercent(126, aaa)).toBe(63)
    expect(barPercent(45, capped)).toBe(75)
  })

  it('a bar never exceeds 100%', () => {
    expect(barPercent(266, aaa)).toBe(100)
    expect(barPercent(60, capped)).toBe(100)
  })

  it('a capped game at its cap says so; below the cap it shows the number', () => {
    expect(fpsText(60, capped)).toBe('60 FPS, limit gry')
    expect(fpsText(41, capped)).toBe('41 FPS')
    expect(fpsText(362, esport)).toBe('362 FPS')
  })
})

describe('fpsRows — what the FPS list draws', () => {
  const games = [
    { slug: 'elden-ring', name: 'Elden Ring', kind: 'capped', fpsCap: 60, settingNote: null },
    {
      slug: 'counter-strike-2',
      name: 'Counter-Strike 2',
      kind: 'esport',
      fpsCap: null,
      settingNote: null,
    },
    {
      slug: 'gothic-1-remake',
      name: 'Gothic 1 Remake',
      kind: 'aaa',
      fpsCap: null,
      settingNote: 'ze skalowaniem DLSS/FSR Balanced',
    },
  ] as const
  const table = buildFpsTable([
    row('m', 350),
    row('e', 60, { game: 'elden-ring' }),
    row('r', 70, { game: 'gothic-1-remake', resolution: 'fullhd' }),
  ])

  it('keeps the order of the games and leaves out games without a number', () => {
    expect(fpsRows(table, 'wampir', games, 'qhd').map((r) => r.game)).toEqual([
      'elden-ring',
      'counter-strike-2',
    ])
  })

  it('carries text, bar, source and the setting note', () => {
    const [elden, cs2] = fpsRows(table, 'wampir', games, 'qhd')
    expect(elden).toMatchObject({ text: '60 FPS, limit gry', percent: 100, kind: 'e' })
    expect(cs2).toMatchObject({
      text: '350 FPS',
      percent: 50,
      kind: 'm',
      sourceUrl: 'https://example.test/',
    })
    const [gothic] = fpsRows(table, 'wampir', games, 'fullhd')
    expect(gothic).toMatchObject({ note: 'ze skalowaniem DLSS/FSR Balanced', kind: 'r' })
  })
})

describe('fpsListRows / initialResolution — empty data never shows an empty list', () => {
  const games = [
    {
      slug: 'counter-strike-2',
      name: 'Counter-Strike 2',
      kind: 'esport',
      fpsCap: null,
      settingNote: null,
    },
  ] as const

  it('a build without any number → null (the section is not rendered)', () => {
    expect(fpsListRows(buildFpsTable([]), 'wampir', games)).toBeNull()
    expect(fpsListRows(buildFpsTable([row('m', 300)]), 'skrzat', games)).toBeNull()
  })

  it('rows for all three resolutions, empty where there is no number', () => {
    const rows = fpsListRows(buildFpsTable([row('m', 300, { resolution: 'uhd' })]), 'wampir', games)
    expect(rows?.fullhd).toEqual([])
    expect(rows?.qhd).toEqual([])
    expect(rows?.uhd).toHaveLength(1)
  })

  it('starts on the preferred resolution, or the first one that has numbers', () => {
    const only4k = fpsListRows(
      buildFpsTable([row('m', 300, { resolution: 'uhd' })]),
      'wampir',
      games,
    )!
    expect(initialResolution(only4k, 'qhd')).toBe('uhd')
    const all = fpsListRows(
      buildFpsTable(RESOLUTIONS.map((resolution) => row('m', 300, { resolution }))),
      'wampir',
      games,
    )!
    expect(initialResolution(all, 'qhd')).toBe('qhd')
  })
})
