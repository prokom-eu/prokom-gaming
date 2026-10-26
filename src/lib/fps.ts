/**
 * FPS on the site (ADR-G004). The site never computes frame rates — it only picks which stored
 * number to show and how to label it. Pure functions, safe in the browser: the configurator
 * (G10) switches numbers live from a table the server passed down. Loading: `fps.server.ts`.
 */

export type Resolution = 'fullhd' | 'qhd' | 'uhd'
export type FpsKind = 'p' | 'm' | 'r' | 'e'

/** One stored number, with build and game as slugs. */
export type FpsResult = {
  build: string
  game: string
  resolution: Resolution
  fps: number
  kind: FpsKind
  sourceLabel: string
  sourceUrl: string | null
  setting: string
  /** Only for `p` (measured at PRO-KOM): the newest measurement wins. */
  measuredAt: string | null
}

/** Display priority: measured at PRO-KOM > independent test > recalculated > estimate. */
export const KIND_PRIORITY: readonly FpsKind[] = ['p', 'm', 'r', 'e']

/** Label shown next to every number and its colour group (tokens `--src-pk/ind/est`). */
export const SOURCES = {
  p: { label: 'zmierzone w PRO-KOM', tone: 'pk' },
  m: { label: 'test niezależny', tone: 'ind' },
  r: { label: 'przeliczone z testów', tone: 'ind' },
  e: { label: 'szacunek', tone: 'est' },
} as const satisfies Record<FpsKind, { label: string; tone: 'pk' | 'ind' | 'est' }>

export type SourceTone = (typeof SOURCES)[FpsKind]['tone']

export function sourceOf(kind: FpsKind): { label: string; tone: SourceTone } {
  return SOURCES[kind]
}

const rank = (kind: FpsKind) => KIND_PRIORITY.indexOf(kind)
const time = (r: FpsResult) => (r.measuredAt ? Date.parse(r.measuredAt) : 0)

/** The number to show out of all stored for one build × game × resolution; `null` when none. */
export function pickResult(rows: readonly FpsResult[]): FpsResult | null {
  let best: FpsResult | null = null
  for (const r of rows) {
    if (
      !best ||
      rank(r.kind) < rank(best.kind) ||
      (r.kind === best.kind && r.kind === 'p' && time(r) > time(best))
    ) {
      best = r
    }
  }
  return best
}

/** Plain JSON object (not a Map), so a server component can hand it to a client one. */
export type FpsTable = Record<string, FpsResult>

const keyOf = (build: string, game: string, resolution: Resolution) =>
  `${build}|${game}|${resolution}`

export function buildFpsTable(rows: readonly FpsResult[]): FpsTable {
  const groups = new Map<string, FpsResult[]>()
  for (const r of rows) {
    const key = keyOf(r.build, r.game, r.resolution)
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  const table: FpsTable = {}
  for (const [key, group] of groups) {
    const best = pickResult(group)
    if (best) table[key] = best
  }
  return table
}

/** The FPS of a build (slug) in a game (slug) at a resolution, or `null` without data. */
export function fpsFor(
  table: FpsTable,
  build: string,
  game: string,
  resolution: Resolution,
): FpsResult | null {
  return table[keyOf(build, game, resolution)] ?? null
}

export type GameScale = { kind: 'esport' | 'aaa' | 'capped'; fpsCap: number | null }

/**
 * Bar length in % (board Zestaw): e-sport titles against 700 FPS, other games against 200, capped
 * games against their cap. Presentation only — the number itself is never changed.
 */
export function barPercent(fps: number, game: GameScale): number {
  const full =
    game.kind === 'capped' && game.fpsCap ? game.fpsCap : game.kind === 'esport' ? 700 : 200
  return Math.min(100, Math.round((fps / full) * 100))
}

/** "362 FPS"; a capped game at its cap reads "60 FPS, limit gry" (board Zestaw). */
export function fpsText(fps: number, game: GameScale): string {
  if (game.fpsCap && fps >= game.fpsCap) return `${game.fpsCap} FPS, limit gry`
  return `${fps} FPS`
}
