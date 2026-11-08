/**
 * Games and FPS results from seed/prokomgaming/ mapped to Payload documents (G5, ADR-G004 §5).
 * Pure functions, no database: the runner (`index.ts`) resolves relations and writes;
 * `fps.test.ts` checks them.
 */
import type { FpsResult, Game } from '../payload-types'
import fpsSourcesSeed from '../../seed/prokomgaming/fps-sources.json'
import gamesSeed from '../../seed/prokomgaming/games.json'

export type SeedGame = {
  name: string
  slug: string
  kind: Game['kind']
  fpsCap: number | null
  setting: string
  popularRank: number
  seoPage: boolean
  requirements: {
    min: string | null
    recommended: string | null
    max: string | null
    source: string | null
    checkedAt: string | null
  }
}

export type SeedFpsSource = {
  build: string
  game: string
  resolution: FpsResult['resolution']
  fps: number
  kind: 'm' | 'r' | 'e'
  source: string
  url: string | null
  setting: string
  cpu: string
  gpu: string
}

export const fpsSeed = {
  games: gamesSeed.items as SeedGame[],
  results: fpsSourcesSeed.items as SeedFpsSource[],
}

/**
 * Note shown next to the game when its test settings differ from the standard (ADR-G004 §6).
 * Only the two cases the ADR names (decision of Krystian, 26.10.2026); the full setting of every
 * number is in "Jak liczymy?".
 */
export const SETTING_NOTES: Record<string, string> = {
  'gothic-1-remake': 'ze skalowaniem DLSS/FSR Balanced',
  'call-of-duty-warzone': 'z testu Black Ops 7',
}

export type GameData = Omit<Game, 'id' | 'createdAt' | 'updatedAt'>

export function mapGame(game: SeedGame): GameData {
  return {
    name: game.name,
    slug: game.slug,
    kind: game.kind,
    fpsCap: game.fpsCap,
    setting: game.setting,
    settingNote: SETTING_NOTES[game.slug] ?? null,
    popularRank: game.popularRank,
    seoPage: game.seoPage,
    requirements: { ...game.requirements },
  }
}

export type FpsResultData = Omit<FpsResult, 'id' | 'createdAt' | 'updatedAt' | 'measuredAt'> & {
  build: number
  game: number
}

/** `source` → `sourceLabel`, `url` → `sourceUrl`; the setting is the record's own (ADR-G004 §5). */
export function mapFpsResult(
  row: SeedFpsSource,
  ids: { build: number; game: number },
): FpsResultData {
  return {
    build: ids.build,
    game: ids.game,
    resolution: row.resolution,
    fps: row.fps,
    kind: row.kind,
    sourceLabel: row.source,
    sourceUrl: row.url,
    setting: row.setting,
    cpu: row.cpu,
    gpu: row.gpu,
  }
}

/** Existing test result (not `p`) as read back with `depth: 0`. */
export type ExistingFpsResult = FpsResultData & { id: number }

const slotKey = (r: { build: number; game: number; resolution: string }) =>
  `${r.build}|${r.game}|${r.resolution}`

const COMPARED = [
  'fps',
  'kind',
  'sourceLabel',
  'sourceUrl',
  'setting',
  'cpu',
  'gpu',
] as const satisfies readonly (keyof FpsResultData)[]

/**
 * What to write so the database matches the seed: new slots are created, changed ones updated in
 * place (one test number per slot — `oneTestResultPerSlot`), identical ones left alone. PRO-KOM
 * measurements (`p`) are never passed in, so the seed cannot touch them.
 */
export function planFpsResults(
  wanted: readonly FpsResultData[],
  existing: readonly ExistingFpsResult[],
): { create: FpsResultData[]; update: { id: number; data: FpsResultData }[] } {
  const bySlot = new Map(existing.map((r) => [slotKey(r), r]))
  const create: FpsResultData[] = []
  const update: { id: number; data: FpsResultData }[] = []
  for (const data of wanted) {
    const found = bySlot.get(slotKey(data))
    if (!found) create.push(data)
    else if (COMPARED.some((field) => (found[field] ?? null) !== (data[field] ?? null))) {
      update.push({ id: found.id, data })
    }
  }
  return { create, update }
}
