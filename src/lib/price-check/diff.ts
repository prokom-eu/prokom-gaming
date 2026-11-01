import 'server-only'

import type { Catalog } from '../pricing/catalog'
import { costContext, reviewAll } from '../pricing/cost'
import { buildQueue, buildsOverview, pricesAfterQueue } from '../pricing/publish'
import { lookupPrice, type PriceSnapshot } from '../pricing/snapshot'
import type { Config } from '../pricing/types'
import type { Decision } from './market'

/**
 * Step 5 of the price check (ADR-G007 §2): the market costs go through lib/pricing — candidate
 * prices, the margins of the builds and the full review at the prices on the site and at the
 * proposed ones. The result is the report's `diff` (JSON); the model only describes it.
 */

export type ItemCategory = 'case' | 'cooler' | 'ram' | 'ssd' | 'cpu' | 'gpu' | 'mobo' | 'psu'

export type CheckItem = {
  itemType: 'option' | 'component'
  /** Option code or the part's `partKey`. */
  code: string
  title: string
  model: string
  category: ItemCategory
  costSource: 'market' | 'invoice'
  cost: number
  costAtBatch: number | null
  /** Builds and level codes that use the item. */
  builds: string[]
  levels: string[]
}

export type OfferRow = {
  url: string
  shop: string
  price: number | null
  available: boolean
  matched: boolean
}

export type ItemRow = CheckItem & {
  key: string
  market: number | null
  decision: Decision
  offers: OfferRow[]
  priceNow: number | null
  priceNew: number | null
}

export type BuildRow = {
  slug: string
  name: string
  priceNow: number | null
  costBatch: number | null
  costNew: number | null
  /** Margin at the prices on the site and the new costs. */
  marginNow: number | null
  priceNew: number | null
  change: number | null
  marginAfter: number | null
}

export type CheckDiff = {
  items: ItemRow[]
  builds: BuildRow[]
  totals: {
    items: number
    found: number
    proposals: number
    manual: number
    unavailable: number
    invoice: number
    /** Of the proposals: price change above the queue threshold (go to „Do zatwierdzenia”). */
    queued: number
    minMargin: number
    averageNow: number | null
    averageAfter: number | null
    lowestNow: number | null
    lowestNowConfig: Config | null
    lowestAfter: number | null
    batch: number
  }
}

const known = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? null : v
const average = (values: (number | null)[]) => {
  const ok = values.filter((v): v is number => v !== null)
  return ok.length > 0 ? ok.reduce((a, v) => a + v, 0) / ok.length : null
}

export function computeDiff(input: {
  catalog: Catalog
  snapshot: PriceSnapshot
  builds: readonly { slug: string; name: string; config: Config }[]
  /** Parts per level code with their key and cost (the catalog has only the sum). */
  levelParts: ReadonlyMap<string, readonly { partKey: string; cost: number }[]>
  /** Costs at the batch (`catalogAtPublish`) for the build cost „z partii”. */
  batchCatalog: Catalog
  items: readonly (CheckItem & { market: number | null; decision: Decision; offers: OfferRow[] })[]
}): CheckDiff {
  const { catalog, snapshot, builds, levelParts, batchCatalog, items } = input
  const proposed = new Map<string, number>()
  for (const item of items) {
    if (item.decision.kind === 'propose') {
      proposed.set(`${item.itemType}:${item.code}`, item.decision.newCost)
    }
  }

  // The catalog with the proposed costs: options directly, levels as the sum of their parts.
  const newCatalog: Catalog = {
    ...catalog,
    options: catalog.options.map((o) => ({
      ...o,
      cost: proposed.get(`option:${o.code}`) ?? o.cost,
    })),
    levels: catalog.levels.map((l) => {
      const parts = levelParts.get(l.code)
      if (!parts) return l
      return {
        ...l,
        partsCost: parts.reduce(
          (sum, p) => sum + (proposed.get(`component:${p.partKey}`) ?? p.cost),
          0,
        ),
      }
    }),
  }

  const queue = buildQueue(newCatalog, snapshot)
  const after = pricesAfterQueue(queue)
  const queuedKeys = new Set(queue.items.map((q) => q.key))
  const reviewAfter = reviewAll(costContext(newCatalog, after))
  const now = buildsOverview(builds, newCatalog, snapshot, null)
  const later = buildsOverview(builds, newCatalog, after, snapshot)
  const atBatch = buildsOverview(builds, batchCatalog, snapshot, null)

  const buildRows: BuildRow[] = builds.map((b, i) => ({
    slug: b.slug,
    name: b.name,
    priceNow: known(now[i]?.price),
    costBatch: known(atBatch[i]?.cost),
    costNew: known(now[i]?.cost),
    marginNow: known(now[i]?.margin),
    priceNew: known(later[i]?.price),
    change: known(later[i]?.change),
    marginAfter: known(later[i]?.margin),
  }))

  const itemRows: ItemRow[] = items.map((item) => {
    const key = `${item.itemType}:${item.code}`
    const priceNow =
      item.itemType === 'option' ? (lookupPrice(snapshot.option, item.code) ?? null) : null
    const priceNew =
      item.itemType === 'option' ? (lookupPrice(after.option, item.code) ?? null) : null
    return { ...item, key, priceNow, priceNew }
  })

  const lowest = queue.publishedReview.minMargin
  const proposals = itemRows.filter((i) => i.decision.kind === 'propose')
  return {
    items: itemRows,
    builds: buildRows,
    totals: {
      items: items.length,
      found: items.filter((i) => i.market !== null).length,
      proposals: proposals.length,
      manual: itemRows.filter((i) => i.decision.kind === 'manual').length,
      unavailable: itemRows.filter((i) => i.decision.kind === 'unavailable').length,
      invoice: itemRows.filter((i) => i.decision.kind === 'invoice').length,
      queued: proposals.filter((i) =>
        i.itemType === 'option'
          ? queuedKeys.has(`option:${i.code}`)
          : i.levels.some((l) => queuedKeys.has(`level:${l}`)),
      ).length,
      minMargin: catalog.settings.minMargin,
      averageNow: average(buildRows.map((b) => b.marginNow)),
      averageAfter: average(buildRows.map((b) => b.marginAfter)),
      lowestNow: known(lowest?.margin),
      lowestNowConfig: lowest
        ? {
            level: lowest.level,
            case: lowest.case,
            cooler: lowest.cooler,
            ram: lowest.ram,
            ssd: lowest.ssd,
          }
        : null,
      lowestAfter: known(reviewAfter.minMargin?.margin),
      batch: snapshot.batch,
    },
  }
}
