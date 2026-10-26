import { describe, expect, it } from 'vitest'

import buildsSeed from '../../seed/prokomgaming/builds.json'
import fpsJson from '../../seed/prokomgaming/fps.json'
import {
  SETTING_NOTES,
  fpsSeed,
  mapFpsResult,
  mapGame,
  planFpsResults,
  type ExistingFpsResult,
} from './fps'

const RES_INDEX = { fullhd: 0, qhd: 1, uhd: 2 } as const
const buildSlugs = new Set((buildsSeed.items as { slug: string }[]).map((b) => b.slug))

describe('seed data (ADR-G004 §2)', () => {
  const { games, results } = fpsSeed

  it('33 games × 16 builds × 3 resolutions = 1 584 numbers: m 833, r 187, e 564', () => {
    expect(games).toHaveLength(33)
    expect(results).toHaveLength(1584)
    const count = (kind: string) => results.filter((r) => r.kind === kind).length
    expect([count('m'), count('r'), count('e')]).toEqual([833, 187, 564])
  })

  it('exactly one record per build × game × resolution, all pointing at known builds and games', () => {
    const names = new Set(games.map((g) => g.name))
    const slots = new Set(results.map((r) => `${r.build}|${r.game}|${r.resolution}`))
    expect(slots.size).toBe(results.length)
    for (const r of results) {
      expect(buildSlugs.has(r.build), r.build).toBe(true)
      expect(names.has(r.game), r.game).toBe(true)
    }
  })

  it('every test and recalculation has a link; estimates have none', () => {
    for (const r of results) {
      if (r.kind === 'e') expect(r.url).toBeNull()
      else expect(r.url, `${r.build} ${r.game} ${r.resolution}`).toMatch(/^https:\/\//)
    }
  })

  it('fps-sources.json = fps.json in every number and kind', () => {
    const table = fpsJson.results as Record<string, Record<string, { v: number[]; k: string }>>
    for (const r of results) {
      const cell = table[r.build][r.game]
      expect(cell.v[RES_INDEX[r.resolution]]).toBe(r.fps)
      expect(cell.k[RES_INDEX[r.resolution]]).toBe(r.kind)
    }
  })
})

describe('mapGame', () => {
  it('copies the game 1:1 and adds the note only for the two cases from ADR-G004 §6', () => {
    const mapped = fpsSeed.games.map(mapGame)
    expect(mapped.filter((g) => g.settingNote).map((g) => g.slug)).toEqual(
      expect.arrayContaining(Object.keys(SETTING_NOTES)),
    )
    expect(mapped.filter((g) => g.settingNote)).toHaveLength(2)
    const elden = mapped.find((g) => g.slug === 'elden-ring')
    expect(elden).toMatchObject({ kind: 'capped', fpsCap: 60, settingNote: null })
  })
})

describe('mapFpsResult', () => {
  it('renames source → sourceLabel and url → sourceUrl, keeps the record setting', () => {
    const row = fpsSeed.results.find((r) => r.kind === 'e' && r.game === 'Fortnite')!
    expect(mapFpsResult(row, { build: 1, game: 2 })).toEqual({
      build: 1,
      game: 2,
      resolution: row.resolution,
      fps: row.fps,
      kind: 'e',
      sourceLabel: row.source,
      sourceUrl: null,
      setting: 'wysokie (szacunek)',
      cpu: row.cpu,
      gpu: row.gpu,
    })
  })
})

describe('planFpsResults — idempotent seed', () => {
  const wanted = fpsSeed.results
    .slice(0, 3)
    .map((r, i) => mapFpsResult(r, { build: 1, game: 10 + i }))
  const asExisting = (rows: typeof wanted): ExistingFpsResult[] =>
    rows.map((r, i) => ({ ...r, id: 100 + i }))

  it('empty database → everything created', () => {
    expect(planFpsResults(wanted, [])).toEqual({ create: wanted, update: [] })
  })

  it('second run → nothing to write', () => {
    expect(planFpsResults(wanted, asExisting(wanted))).toEqual({ create: [], update: [] })
  })

  it('a changed number or kind updates that slot in place', () => {
    const existing = asExisting(wanted)
    existing[1] = { ...existing[1], fps: existing[1].fps + 7, kind: 'e' }
    expect(planFpsResults(wanted, existing)).toEqual({
      create: [],
      update: [{ id: 101, data: wanted[1] }],
    })
  })

  it('undefined and null read back the same (optional fields)', () => {
    const existing = asExisting(wanted).map((r) => ({ ...r, sourceUrl: r.sourceUrl ?? undefined }))
    expect(planFpsResults(wanted, existing as ExistingFpsResult[]).update).toEqual([])
  })
})
