import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { loadFpsTable } from './fps.server'
import {
  buildHero,
  gamesPanel,
  metricSample,
  type HomeData,
  type HeroLevelInput,
  type PanelGame,
} from './home'
import { snapshotFromRows, type PriceSnapshot } from './pricing/snapshot'

const idOf = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value && typeof value.id === 'number'
      ? value.id
      : null

/**
 * Data of the home page: the hero and the sections that need the database (16 creatures, games
 * panel, sample certificate). Everything is read as the public visitor (`overrideAccess: false`) with
 * an explicit `select` — except the level's parts: `components` is panel-only as a whole (it holds
 * `internalModel` and `cost`), so it is read trusted and only `role` + `publicLabel` of the CPU and
 * GPU are copied out, field by field (ADR-G002 §8.7; same pattern as `inquiry/pricingStore.ts`).
 */
export async function loadHome(): Promise<HomeData> {
  const payload = await getPayload({ config })
  const asVisitor = { overrideAccess: false, depth: 0, pagination: false } as const

  const [builds, levels, parts, options, snapshot, fps] = await Promise.all([
    payload.find({
      collection: 'builds',
      select: {
        slug: true,
        name: true,
        level: true,
        case: true,
        cooler: true,
        ram: true,
        ssd: true,
        creature: {
          key: true,
          accusative: true,
          epithet: true,
          look: true,
          heroTitle: true,
          heroText: true,
        },
      },
      ...asVisitor,
    }),
    payload.find({
      collection: 'power-levels',
      select: {
        code: true,
        tier: true,
        tierRoman: true,
        tierLabel: true,
        tierLead: true,
        targetResolution: true,
        leadBuild: true,
      },
      ...asVisitor,
    }),
    payload.find({
      collection: 'power-levels',
      select: { components: { role: true, publicLabel: true } },
      overrideAccess: true,
      depth: 0,
      pagination: false,
    }),
    payload.find({
      collection: 'options',
      select: { code: true, publicLabel: true, image: true },
      // `url` is computed from `filename`, so both are selected.
      populate: { media: { url: true, filename: true, alt: true } },
      overrideAccess: false,
      depth: 1,
      pagination: false,
    }),
    loadPublishedSnapshot(payload),
    loadFpsTable(),
  ])

  const levelCode = new Map(levels.docs.map((l) => [l.id, l.code]))
  const optionCode = new Map(options.docs.map((o) => [o.id, o.code]))
  const buildSlug = new Map(builds.docs.map((b) => [b.id, b.slug]))
  const partLabel = new Map(
    parts.docs.map((l) => {
      const label = (role: string) =>
        l.components?.find((c) => c.role === role)?.publicLabel ?? null
      return [l.id, { cpu: label('cpu'), gpu: label('gpu') }]
    }),
  )

  const levelInputs: HeroLevelInput[] = levels.docs.map((l) => {
    const lead = idOf(l.leadBuild)
    return {
      code: l.code,
      tier: l.tier,
      tierRoman: l.tierRoman,
      tierLabel: l.tierLabel,
      tierLead: l.tierLead ?? false,
      targetResolution: l.targetResolution,
      leadBuild: lead === null ? null : (buildSlug.get(lead) ?? null),
      cpu: partLabel.get(l.id)?.cpu ?? null,
      gpu: partLabel.get(l.id)?.gpu ?? null,
    }
  })

  const code = (map: Map<number, string>, value: unknown): string => {
    const id = idOf(value)
    return (id !== null && map.get(id)) || ''
  }

  const hero = buildHero({
    builds: builds.docs.map((b) => ({
      slug: b.slug,
      name: b.name,
      config: {
        level: code(levelCode, b.level),
        case: code(optionCode, b.case),
        cooler: code(optionCode, b.cooler),
        ram: code(optionCode, b.ram),
        ssd: code(optionCode, b.ssd),
      },
      creature: {
        key: b.creature.key,
        accusative: b.creature.accusative,
        epithet: b.creature.epithet,
        look: b.creature.look,
        heroTitle: b.creature.heroTitle,
        heroText: b.creature.heroText,
      },
    })),
    levels: levelInputs,
    options: options.docs.map((o) => {
      const image = o.image && typeof o.image === 'object' ? o.image : null
      return {
        code: o.code,
        publicLabel: o.publicLabel,
        photo: image?.url ? { src: image.url, alt: image.alt } : null,
      }
    }),
    snapshot,
    fps: fps.table,
  })
  const games: PanelGame[] = fps.games.map((g) => ({
    slug: g.slug,
    name: g.name,
    kind: g.kind,
    fpsCap: g.fpsCap,
  }))
  return {
    hero,
    panel: games.length > 0 && hero.tiers.length > 0 ? gamesPanel(hero, games, fps.table) : null,
    metric: metricSample(hero, games, fps.table),
  }
}

/** Newest published batch as the visitor sees it (`costAtPublish` is panel-only). */
async function loadPublishedSnapshot(
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<PriceSnapshot | null> {
  const newest = await payload.find({
    collection: 'published-prices',
    select: { batch: true },
    sort: '-batch',
    limit: 1,
    overrideAccess: false,
    depth: 0,
  })
  const batch = newest.docs[0]?.batch
  if (batch === undefined) return null
  const rows = await payload.find({
    collection: 'published-prices',
    where: { batch: { equals: batch } },
    select: { batch: true, itemType: true, itemCode: true, sellPrice: true, publishedAt: true },
    overrideAccess: false,
    depth: 0,
    pagination: false,
  })
  return snapshotFromRows(rows.docs)
}
