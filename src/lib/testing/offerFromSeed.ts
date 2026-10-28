/**
 * The public offer built from the seed, the way `lib/offer.server.ts` maps the database (codes
 * instead of ids). Tests only: hero inputs, the first price batch and the full FPS table.
 */
import { fpsSeed } from '../../seed/fps'
import { firstBatch, firstBatchPublishedAt, seed } from '../../seed/offer'
import type { CardExtras } from '../builds'
import { buildFpsTable } from '../fps'
import type { HeroBuildInput, HeroLevelInput, HeroOptionInput } from '../home'
import { snapshotFromRows } from '../pricing/snapshot'

const creature = new Map(seed.creatures.map((c) => [c.slug, c]))

export const seedBuilds: HeroBuildInput[] = seed.builds.map((b) => {
  const c = creature.get(b.creature)!
  return {
    slug: b.slug,
    name: b.name,
    config: { level: b.level, case: b.case, cooler: b.cooler, ram: b.ram, ssd: b.ssd },
    creature: {
      key: c.id,
      accusative: c.accusative,
      epithet: c.epithet,
      look: c.look,
      heroTitle: c.heroTitle,
      heroText: c.heroText,
    },
  }
})

export const seedLevels: HeroLevelInput[] = seed.levels.map((l) => ({
  code: l.code,
  tier: l.tier,
  tierRoman: l.tierRoman,
  tierLabel: l.tierLabel,
  tierLead: l.tierLead,
  targetResolution: l.targetResolution,
  leadBuild: l.leadBuild,
  cpu: l.components.find((c) => c.role === 'cpu')?.publicLabel ?? null,
  gpu: l.components.find((c) => c.role === 'gpu')?.publicLabel ?? null,
}))

export const seedOptions: HeroOptionInput[] = seed.options.map((o) => ({
  code: o.code,
  publicLabel: o.publicLabel,
  photo: o.image ? { src: `/api/media/file/${o.code}.webp`, alt: o.publicLabel } : null,
}))

export const seedSnapshot = snapshotFromRows(
  firstBatch().map((row) => ({ ...row, batch: 1, publishedAt: firstBatchPublishedAt() })),
)

/** Every FPS number of `fps-sources.json` as `loadFpsTable()` reads it back. */
const gameSlug = new Map(fpsSeed.games.map((g) => [g.name, g.slug]))
export const seedFpsTable = buildFpsTable(
  fpsSeed.results.map((r) => ({
    build: r.build,
    game: gameSlug.get(r.game)!,
    resolution: r.resolution,
    fps: r.fps,
    kind: r.kind,
    sourceLabel: r.source,
    sourceUrl: r.url,
    setting: r.setting,
    measuredAt: null,
  })),
)

/** `loadOffer()` extras per build slug. */
export const seedExtras = new Map<string, CardExtras>(
  seed.builds.map((b) => {
    const c = creature.get(b.creature)!
    const level = seed.levels.find((l) => l.code === b.level)!
    return [
      b.slug,
      {
        short: c.short,
        shell: c.shell,
        monitorFilters: level.monitorFilters,
        platform: level.platform,
      },
    ]
  }),
)
