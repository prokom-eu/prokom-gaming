import 'server-only'

import type { Catalog, PriceRow } from '../../lib/pricing/catalog'
import { costContext, reviewAll } from '../../lib/pricing/cost'
import { buildsOverview, pricesAfterQueue, type QueueState } from '../../lib/pricing/publish'
import type { PriceList } from '../../lib/pricing/snapshot'
import type { Config } from '../../lib/pricing/types'
import { averageMargin } from './series'

/**
 * Margins of the Pulpit (panel spec §3 pt 2 and 4) — all from `lib/pricing` (ADR-G002), never
 * computed here. Three views of the 16 builds:
 * - `batch`: prices and costs from the publication („Ceny 25.10”, costs = `costAtPublish`),
 * - `today`: the prices on the site with today's costs („Dzisiejsze koszty”),
 * - `after`: the prices after approving the whole queue with today's costs („Po zatwierdzeniu”;
 *   minor changes outside the queue keep their published price, like the publication).
 * Server-only: costs go in, only prices and margins come out.
 */

export type MarginMode = 'batch' | 'today' | 'after'

export type BuildMargin = { price: number | null; margin: number | null }

export type BuildMargins = {
  slug: string
  name: string
  /** File name of the sigil (`builds.creature.key`). */
  sigil: string
  /** „Moc VI” — the level's tier. */
  tier: string
  modes: Partial<Record<MarginMode, BuildMargin>>
}

export type MarginsView = {
  minMargin: number
  warnMargin: number
  /** Modes that exist: `after` only with a non-empty queue, `batch` only with costs at publish. */
  modes: MarginMode[]
  /** Sorted by today's margin, lowest first (spec §3 pt 4). */
  builds: BuildMargins[]
  average: Partial<Record<MarginMode, number | null>>
  /** Lowest margin in the configurator (the full review), per mode. */
  lowest: Partial<Record<MarginMode, number | null>>
  queueCount: number
}

type BuildInput = {
  slug: string
  name: string
  config: Config
  sigil: string
  tier: string
}

/**
 * The catalog with costs as they were at publication (`published-prices.costAtPublish`). A
 * level, option or service without a recorded cost (added after the batch) gets `NaN`, so every
 * margin that depends on it comes out unknown — shown as „—”, never as a guess.
 */
export function catalogAtPublish(
  catalog: Catalog,
  rows: readonly Pick<PriceRow, 'itemType' | 'itemCode' | 'costAtPublish'>[],
): Catalog {
  const cost = (type: PriceRow['itemType'], code: string) => {
    const row = rows.find((r) => r.itemType === type && r.itemCode === code)
    return row?.costAtPublish ?? Number.NaN
  }
  const service = rows.find((r) => r.itemType === 'service')?.costAtPublish ?? Number.NaN
  return {
    ...catalog,
    levels: catalog.levels.map((l) => ({ ...l, partsCost: cost('level', l.code) })),
    options: catalog.options.map((o) => ({ ...o, cost: cost('option', o.code) })),
    settings: { ...catalog.settings, serviceCost: service },
  }
}

const known = (value: number | null | undefined): number | null =>
  value === null || value === undefined || !Number.isFinite(value) ? null : value

function margins(
  builds: readonly BuildInput[],
  catalog: Catalog,
  prices: PriceList,
): BuildMargin[] {
  return buildsOverview(builds, catalog, prices, null).map((row) => ({
    price: known(row.price),
    margin: known(row.margin),
  }))
}

/** Lowest margin of the full review; `null` when it cannot be computed (missing cost or price). */
function lowestOf(catalog: Catalog, prices: PriceList): number | null {
  // A configuration with an unknown cost has a NaN margin, which never compares as lower — the
  // review would quietly skip it. One unknown cost = no honest minimum.
  const costs = [
    catalog.settings.serviceCost,
    ...catalog.levels.map((l) => l.partsCost),
    ...catalog.options.filter((o) => o.active).map((o) => o.cost),
  ]
  if (!costs.every(Number.isFinite)) return null
  try {
    return known(reviewAll(costContext(catalog, prices)).minMargin?.margin)
  } catch {
    return null
  }
}

/**
 * Everything the Pulpit shows about margins, from one `buildQueue()` result (its review of the
 * prices on the site is reused, not recomputed). `batchRows` = rows of the newest batch.
 */
export function marginsView(
  builds: readonly BuildInput[],
  catalog: Catalog,
  queue: QueueState,
  batchRows: readonly Pick<PriceRow, 'itemType' | 'itemCode' | 'costAtPublish'>[],
  warnMargin: number,
): MarginsView {
  const { minMargin } = catalog.settings
  const published = queue.effectivePublished
  const approved = queue.items.length > 0 ? pricesAfterQueue(queue) : null

  const today = margins(builds, catalog, published)
  const atPublish = catalogAtPublish(catalog, batchRows)
  const batch = margins(builds, atPublish, published)
  const after = approved ? margins(builds, catalog, approved) : null
  const hasBatch = batch.some((b) => b.margin !== null)

  const modes: MarginMode[] = [...(hasBatch ? ['batch' as const] : []), 'today']
  if (after) modes.push('after')

  const rows: BuildMargins[] = builds.map((b, i) => ({
    slug: b.slug,
    name: b.name,
    sigil: b.sigil,
    tier: b.tier,
    modes: {
      today: today[i]!,
      ...(hasBatch ? { batch: batch[i]! } : {}),
      ...(after ? { after: after[i]! } : {}),
    },
  }))
  rows.sort(
    (a, b) =>
      (a.modes.today?.margin ?? -Infinity) - (b.modes.today?.margin ?? -Infinity) ||
      a.name.localeCompare(b.name, 'pl'),
  )

  return {
    minMargin,
    warnMargin,
    modes,
    builds: rows,
    average: {
      today: averageMargin(today.map((b) => b.margin)),
      ...(hasBatch ? { batch: averageMargin(batch.map((b) => b.margin)) } : {}),
      ...(after ? { after: averageMargin(after.map((b) => b.margin)) } : {}),
    },
    lowest: {
      today: known(queue.publishedReview.minMargin?.margin),
      ...(hasBatch ? { batch: lowestOf(atPublish, published) } : {}),
      ...(approved ? { after: lowestOf(catalog, approved) } : {}),
    },
    queueCount: queue.items.length,
  }
}
