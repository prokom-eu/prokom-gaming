import 'server-only'

import type { Payload } from 'payload'

import { CatalogError, type Catalog } from '../../lib/pricing/catalog'
import { costList } from '../../lib/pricing/cost'
import { recipeFigures } from '../../lib/pricing/recipe'
import type { PriceList, PriceSnapshot } from '../../lib/pricing/snapshot'
import { loadBatch, loadOffer, type OfferData } from '../../lib/pricing/store'
import { catalogAtPublish } from '../dashboard/margins'

export type OfferStatus = 'published' | 'draft' | 'hidden'
export type Monitor = 'fullhd' | 'qhd' | 'uhd'

/** One card of „Gotowe zestawy” (panel spec §9, board Zestawy). Panel only: costs. */
export type BuildCard = {
  slug: string
  name: string
  sigil: string
  status: OfferStatus
  /** „Moc I · FullHD start”. */
  tier: string
  monitors: Monitor[]
  price: number | null
  batch: { cost: number | null; margin: number | null }
  today: { cost: number | null; margin: number | null }
  recipe: { level: string; case: string; cooler: string; ramSsd: string }
}

export type BuildsData = {
  cards: BuildCard[]
  minMargin: number
  warnMargin: number
}

/** Everything the editor and the list need about the offer, read once. */
export type BuildsContext = {
  offer: OfferData
  snapshot: PriceSnapshot
  /** Costs today and at the batch, in the shape of a price list (`costList`). */
  costsToday: PriceList
  costsAtBatch: PriceList
  levels: {
    id: number
    code: string
    tierRoman: string
    tierLabel: string
    variant: string | null
    publicLabel: string
    monitorFilters: Monitor[]
  }[]
  labels: Map<string, string>
  creatures: Map<string, string>
  warnMargin: number
}

const trusted = { overrideAccess: true, depth: 0, pagination: false } as const

/** „P01 · Ryzen 5 5500 + RX 7600 8 GB” — the level's code and the first part of its classes. */
export const levelLine = (code: string, publicLabel: string) =>
  `${code} · ${publicLabel.split(',')[0]?.trim() ?? publicLabel}`

export async function loadBuildsContext(
  payload: Payload,
): Promise<BuildsContext | { error: string }> {
  try {
    const current = await loadBatch(payload)
    if (!current) return { error: 'Brak opublikowanych cen — uruchom seed.' }
    const [offer, levels, options, builds, batchRows, settings] = await Promise.all([
      loadOffer(payload),
      payload.find({
        collection: 'power-levels',
        sort: 'code',
        select: {
          code: true,
          tierRoman: true,
          tierLabel: true,
          variant: true,
          publicLabel: true,
          monitorFilters: true,
        },
        ...trusted,
      }),
      payload.find({
        collection: 'options',
        select: { code: true, publicLabel: true },
        ...trusted,
      }),
      payload.find({
        collection: 'builds',
        select: { slug: true, creature: { key: true } },
        ...trusted,
      }),
      payload.find({
        collection: 'published-prices',
        where: { batch: { equals: current.snapshot.batch } },
        select: { itemType: true, itemCode: true, costAtPublish: true },
        ...trusted,
      }),
      payload.findGlobal({ slug: 'pricing-settings', depth: 0, overrideAccess: true }),
    ])
    const atBatch: Catalog = catalogAtPublish(
      offer.catalog,
      batchRows.docs.map((r) => ({ ...r, costAtPublish: r.costAtPublish ?? null })),
    )
    return {
      offer,
      snapshot: current.snapshot,
      costsToday: costList(offer.catalog),
      costsAtBatch: costList(atBatch),
      levels: levels.docs.map((l) => ({
        id: l.id,
        code: l.code,
        tierRoman: l.tierRoman,
        tierLabel: l.tierLabel,
        variant: l.variant ?? null,
        publicLabel: l.publicLabel,
        monitorFilters: (l.monitorFilters ?? []) as Monitor[],
      })),
      labels: new Map(options.docs.map((o) => [o.code, o.publicLabel])),
      creatures: new Map(builds.docs.map((b) => [b.slug, b.creature?.key ?? b.slug])),
      warnMargin: settings.warnMargin ?? 0.12,
    }
  } catch (error) {
    if (error instanceof CatalogError) return { error: error.message }
    throw error
  }
}

/** The cards of the list: 16 builds with price, costs and margins at the batch and today. */
export function buildCards(ctx: BuildsContext): BuildCard[] {
  const level = new Map(ctx.levels.map((l) => [l.code, l]))
  const label = (code: string) => ctx.labels.get(code) ?? code
  return ctx.offer.builds.map((b) => {
    const l = level.get(b.config.level)
    const batch = recipeFigures(b.config, ctx.snapshot, ctx.costsAtBatch)
    const today = recipeFigures(b.config, ctx.snapshot, ctx.costsToday)
    return {
      slug: b.slug,
      name: b.name,
      sigil: ctx.creatures.get(b.slug) ?? b.slug,
      status: b.offerStatus,
      tier: l ? `Moc ${l.tierRoman} · ${l.tierLabel}` : b.config.level,
      monitors: l?.monitorFilters ?? [],
      price: today.price,
      batch: { cost: batch.cost, margin: batch.margin },
      today: { cost: today.cost, margin: today.margin },
      recipe: {
        level: l ? levelLine(l.code, l.publicLabel) : b.config.level,
        case: label(b.config.case),
        cooler: label(b.config.cooler),
        ramSsd: `${label(b.config.ram)} · ${label(b.config.ssd)}`,
      },
    }
  })
}
