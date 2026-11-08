import 'server-only'

import type { Payload } from 'payload'

import { CatalogError } from '../../lib/pricing/catalog'
import { margin } from '../../lib/pricing/cost'
import { buildQueue, itemKey, type ItemKey, type QueueState } from '../../lib/pricing/publish'
import { lookupPrice } from '../../lib/pricing/snapshot'
import { loadBatch, loadOffer, type BatchInfo, type OfferData } from '../../lib/pricing/store'
import { SERVICE_CODE } from '../../lib/pricing/types'
import type { PowerLevel } from '../../payload-types'

/** Category filter of the prices table (panel spec §8). */
export type Category = 'level' | 'case' | 'cooler' | 'ram' | 'ssd' | 'service'

export const CATEGORY_LABEL: Record<Category, string> = {
  level: 'Poziom mocy',
  case: 'Obudowa',
  cooler: 'Chłodzenie',
  ram: 'RAM',
  ssd: 'Dysk',
  service: 'Usługa',
}

/** One sold item as the panel shows it: names, costs, prices, margin. Panel only. */
export type PriceItem = {
  key: ItemKey
  category: Category
  code: string
  /** „P10 · Moc VI 2K wysokie · Radeon”, „16 GB DDR4 3200 (2x8)”. */
  title: string
  /** Second line: the level's classes or the option's internal model. */
  detail: string | null
  /** Names of the builds that use the item (all builds for the service). */
  builds: string[]
  costAtBatch: number | null
  costToday: number
  published: number | null
  candidate: number
  /** Margin of the item at today's cost and the price on the site. */
  margin: number | null
  /** `settings` = the service, whose cost is a pricing setting. */
  costSource: 'market' | 'invoice' | 'mixed' | 'settings'
  /** Panel edit address of the item (Payload document). */
  editPath: string
}

export type BatchEntry = { batch: number; publishedAt: string; by: string | null }

export type PricesData = {
  offer: OfferData
  current: BatchInfo
  queue: QueueState
  items: PriceItem[]
  levelParts: Map<string, { role: string; cost: number }[]>
  batches: BatchEntry[]
  warnMargin: number
}

const trusted = { overrideAccess: true, depth: 0, pagination: false } as const

export const levelTitle = (l: Pick<PowerLevel, 'code' | 'tierRoman' | 'tierLabel' | 'variant'>) =>
  `${l.code} · Moc ${l.tierRoman} ${l.tierLabel}${l.variant ? ` · ${l.variant}` : ''}`

const sourceOf = (sources: readonly (string | null | undefined)[]): PriceItem['costSource'] => {
  const set = new Set(sources.map((s) => s ?? 'market'))
  return set.size > 1 ? 'mixed' : ((set.values().next().value ?? 'market') as 'market' | 'invoice')
}

/**
 * Everything the prices centre and „Do zatwierdzenia” show, read once: the offer with costs, the
 * newest batch, the queue (`buildQueue()` from G4) and each sold item with names and costs. A
 * data error (broken batch, missing cost) becomes a message on the screen.
 */
export async function loadPrices(payload: Payload): Promise<PricesData | { error: string }> {
  try {
    const current = await loadBatch(payload)
    if (!current) return { error: 'Brak opublikowanych cen — uruchom seed.' }
    const [offer, levels, options, batchRows, settings, batches] = await Promise.all([
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
          components: true,
        },
        ...trusted,
      }),
      payload.find({
        collection: 'options',
        sort: 'code',
        select: {
          code: true,
          type: true,
          publicLabel: true,
          internalModel: true,
          costSource: true,
        },
        ...trusted,
      }),
      payload.find({
        collection: 'published-prices',
        where: { batch: { equals: current.snapshot.batch } },
        select: { itemType: true, itemCode: true, costAtPublish: true },
        ...trusted,
      }),
      payload.findGlobal({ slug: 'pricing-settings', depth: 0, overrideAccess: true }),
      // One service row per batch: its number, date and author (like the Pulpit events).
      payload.find({
        collection: 'published-prices',
        where: { itemType: { equals: 'service' } },
        sort: '-batch',
        limit: 5,
        depth: 1,
        populate: { users: { email: true } },
        select: { batch: true, publishedAt: true, publishedBy: true },
        overrideAccess: true,
      }),
    ])

    const queue = buildQueue(offer.catalog, current.snapshot)
    const atBatch = new Map(
      batchRows.docs.map((r) => [`${r.itemType}:${r.itemCode}`, r.costAtPublish ?? null]),
    )
    const usedBy = (pick: (c: OfferData['builds'][number]['config']) => string, code: string) =>
      offer.builds.filter((b) => pick(b.config) === code).map((b) => b.name)
    const admin = payload.config.routes.admin
    const priceOf = (key: ItemKey): { published: number | null; candidate: number } => {
      const [type, code] = key.split(/:(.*)/) as ['level' | 'option' | 'service', string]
      const pick = (list: {
        level: Record<string, number>
        option: Record<string, number>
        service: number
      }) =>
        type === 'service'
          ? list.service
          : lookupPrice(type === 'level' ? list.level : list.option, code)
      return {
        published: type === 'service' ? current.snapshot.service : (pick(current.snapshot) ?? null),
        candidate: pick(queue.candidates)!,
      }
    }

    const items: PriceItem[] = []
    for (const level of levels.docs) {
      const cost = offer.catalog.levels.find((l) => l.code === level.code)?.partsCost ?? 0
      const key = itemKey('level', level.code)
      const { published, candidate } = priceOf(key)
      items.push({
        key,
        category: 'level',
        code: level.code,
        title: levelTitle(level),
        detail: level.publicLabel ?? null,
        builds: usedBy((c) => c.level, level.code),
        costAtBatch: atBatch.get(key) ?? null,
        costToday: cost,
        published,
        candidate,
        margin: published ? margin(published, cost) : null,
        costSource: sourceOf((level.components ?? []).map((c) => c.costSource)),
        editPath: `${admin}/collections/power-levels/${level.id}`,
      })
    }
    for (const option of options.docs) {
      const cost = offer.catalog.options.find((o) => o.code === option.code)?.cost ?? 0
      const key = itemKey('option', option.code)
      const { published, candidate } = priceOf(key)
      const slot = option.type
      items.push({
        key,
        category: slot,
        code: option.code,
        title: option.publicLabel,
        detail: option.internalModel ?? null,
        builds: usedBy((c) => c[slot], option.code),
        costAtBatch: atBatch.get(key) ?? null,
        costToday: cost,
        published,
        candidate,
        margin: published ? margin(published, cost) : null,
        costSource: sourceOf([option.costSource]),
        editPath: `${admin}/collections/options/${option.id}`,
      })
    }
    const serviceKey = itemKey('service', SERVICE_CODE)
    const service = priceOf(serviceKey)
    const serviceCost = offer.catalog.settings.serviceCost
    items.push({
      key: serviceKey,
      category: 'service',
      code: SERVICE_CODE,
      title: 'Usługa (Windows, wysyłka)',
      detail: null,
      builds: offer.builds.map((b) => b.name),
      costAtBatch: atBatch.get(serviceKey) ?? null,
      costToday: serviceCost,
      published: service.published,
      candidate: service.candidate,
      margin: service.published ? margin(service.published, serviceCost) : null,
      costSource: 'settings',
      editPath: `${admin}/globals/pricing-settings`,
    })

    return {
      offer,
      current,
      queue,
      items,
      levelParts: new Map(
        levels.docs.map((l) => [
          l.code,
          (l.components ?? []).map((c) => ({ role: c.role, cost: c.cost })),
        ]),
      ),
      batches: batches.docs.map((b) => ({
        batch: b.batch,
        publishedAt: b.publishedAt,
        by:
          typeof b.publishedBy === 'object' && b.publishedBy
            ? b.publishedBy.email.split('@')[0] || null
            : null,
      })),
      warnMargin: settings.warnMargin ?? 0.12,
    }
  } catch (error) {
    if (error instanceof CatalogError) return { error: error.message }
    throw error
  }
}
