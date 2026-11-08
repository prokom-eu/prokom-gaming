import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { buildFpsTable, type FpsResult, type FpsTable, type GameScale } from './fps'

/** What the site needs about a game next to its numbers. */
export type FpsGame = GameScale & {
  slug: string
  name: string
  settingNote: string | null
  popularRank: number
}

/**
 * FPS table for pages (ADR-G004): numbers of the given builds (slugs; all when omitted), already
 * reduced to one per build × game × resolution by priority, plus the games in site order.
 * Always as the public visitor (`overrideAccess: false`) with an explicit `select`: the Local API
 * otherwise returns panel-only fields (`cpu`, `gpu` name the level's parts — ADR-G002 §8.7).
 */
export async function loadFpsTable(
  options: { builds?: readonly string[] } = {},
): Promise<{ table: FpsTable; games: FpsGame[] }> {
  const payload = await getPayload({ config })
  const asVisitor = { overrideAccess: false, depth: 0, pagination: false } as const

  const [builds, games] = await Promise.all([
    payload.find({
      collection: 'builds',
      select: { slug: true },
      ...(options.builds && { where: { slug: { in: [...options.builds] } } }),
      ...asVisitor,
    }),
    payload.find({
      collection: 'games',
      select: {
        slug: true,
        name: true,
        kind: true,
        fpsCap: true,
        settingNote: true,
        popularRank: true,
      },
      sort: 'popularRank',
      ...asVisitor,
    }),
  ])
  const buildSlug = new Map(builds.docs.map((b) => [b.id, b.slug]))
  const gameSlug = new Map(games.docs.map((g) => [g.id, g.slug]))
  const gameList: FpsGame[] = games.docs.map((g) => ({
    slug: g.slug,
    name: g.name,
    kind: g.kind,
    fpsCap: g.fpsCap ?? null,
    settingNote: g.settingNote ?? null,
    popularRank: g.popularRank,
  }))
  // Unknown slugs or an empty database: no query with an empty `in` (its meaning is up to the
  // adapter) — simply no numbers.
  if (buildSlug.size === 0) return { table: {}, games: gameList }

  const results = await payload.find({
    collection: 'fps-results',
    where: { build: { in: [...buildSlug.keys()] } },
    select: {
      build: true,
      game: true,
      resolution: true,
      fps: true,
      kind: true,
      sourceLabel: true,
      sourceUrl: true,
      setting: true,
      measuredAt: true,
    },
    ...asVisitor,
  })

  const rows: FpsResult[] = []
  for (const r of results.docs) {
    const build = buildSlug.get(r.build as number)
    const game = gameSlug.get(r.game as number)
    if (!build || !game) continue
    rows.push({
      build,
      game,
      resolution: r.resolution,
      fps: r.fps,
      kind: r.kind,
      sourceLabel: r.sourceLabel,
      sourceUrl: r.sourceUrl ?? null,
      setting: r.setting,
      measuredAt: r.measuredAt ?? null,
    })
  }

  return { table: buildFpsTable(rows), games: gameList }
}
