import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { CardExtras } from './builds'
import { loadFpsTable } from './fps.server'
import { buildHero, type HeroData, type HeroLevelInput } from './home'
import { snapshotFromRows, type PriceSnapshot } from './pricing/snapshot'

type Payload = Awaited<ReturnType<typeof getPayload>>

export type OfferData = {
  hero: HeroData
  fps: Awaited<ReturnType<typeof loadFpsTable>>
  extras: Map<string, CardExtras>
}

const idOf = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value && typeof value.id === 'number'
      ? value.id
      : null

/**
 * The offer as the public sees it: 16 builds with their level, parts' public labels, case photo,
 * sell price and FPS. Shared by the home page and `/zestawy`. Everything is read as the visitor
 * (`overrideAccess: false`) with an explicit `select` — except the level's parts: `components` is
 * panel-only as a whole (it holds `internalModel` and `cost`), so it is read trusted and only
 * `role` + `publicLabel` of the CPU and GPU are copied out, field by field (ADR-G002 §8.7; same
 * pattern as `inquiry/pricingStore.ts`).
 */
export async function loadOffer(payload: Payload): Promise<OfferData> {
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
          short: true,
          shell: true,
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
        monitorFilters: true,
        platform: true,
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

  const levelById = new Map(levels.docs.map((l) => [l.id, l]))
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

  const optionOf = (value: unknown): string => {
    const id = idOf(value)
    return (id !== null && optionCode.get(id)) || ''
  }

  const extras = new Map<string, CardExtras>()
  for (const b of builds.docs) {
    const levelId = idOf(b.level)
    const level = levelId === null ? undefined : levelById.get(levelId)
    if (!level) continue
    extras.set(b.slug, {
      short: b.creature.short,
      shell: b.creature.shell,
      monitorFilters: level.monitorFilters ?? [],
      platform: level.platform,
    })
  }

  const hero = buildHero({
    builds: builds.docs.map((b) => {
      const levelId = idOf(b.level)
      return {
        slug: b.slug,
        name: b.name,
        config: {
          level: (levelId !== null && levelById.get(levelId)?.code) || '',
          case: optionOf(b.case),
          cooler: optionOf(b.cooler),
          ram: optionOf(b.ram),
          ssd: optionOf(b.ssd),
        },
        creature: {
          key: b.creature.key,
          accusative: b.creature.accusative,
          epithet: b.creature.epithet,
          look: b.creature.look,
          heroTitle: b.creature.heroTitle,
          heroText: b.creature.heroText,
        },
      }
    }),
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

  return { hero, fps, extras }
}

/** Newest published batch as the visitor sees it (`costAtPublish` is panel-only). */
async function loadPublishedSnapshot(payload: Payload): Promise<PriceSnapshot | null> {
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

/** Shared entry point for pages: one Payload instance, the public offer. */
export async function loadPublicOffer(): Promise<OfferData> {
  return loadOffer(await getPayload({ config }))
}
