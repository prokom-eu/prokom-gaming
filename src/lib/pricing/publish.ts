import 'server-only'

import type { Catalog, CostLevel, PriceRow } from './catalog'
import {
  costContext,
  evaluate,
  reviewAll,
  sellLevel,
  sellPrices,
  type PricedConfig,
  type Review,
} from './cost'
import { percent, share, zl } from './format'
import { lookupPrice, type PriceList, type PriceSnapshot } from './snapshot'
import { SERVICE_CODE, type Config } from './types'

/**
 * Price publication (ADR-G002 §4): the "to approve" queue, the margin guard before every
 * publication and the rows of a new batch. Pure functions — `store.ts` reads and writes the
 * database, the panel screen only shows the result. Server-only: works on costs.
 */

export type SoldItemType = 'level' | 'option' | 'service'

/** `level:P01`, `option:R16`, `service:SERVICE` — what the panel sends back when approving. */
export type ItemKey = `${SoldItemType}:${string}`

export const itemKey = (type: SoldItemType, code: string): ItemKey => `${type}:${code}`

export type QueueReason =
  /** The new price differs from the published one by more than `publishThreshold`. */
  | 'threshold'
  /** The published price at today's cost breaks the minimum margin. */
  | 'urgent'
  /** Never published — always part of the next publication. */
  | 'new'

export type QueueItem = {
  key: ItemKey
  itemType: SoldItemType
  itemCode: string
  published: number | null
  candidate: number
  /** Relative change vs published; `null` for a new item. */
  change: number | null
  reasons: QueueReason[]
}

export type QueueState = {
  items: QueueItem[]
  /** Price changes under the threshold: not queued, prices stay stable (ADR-G002 §1.4). */
  minorChanges: number
  /** Guard over the prices on the site today, at today's costs. */
  publishedReview: Review
  /** Levels whose published prices break the minimum margin today, each with its fix. */
  brokenLevels: LevelBelowMinProblem[]
  /** Published prices with never-published items filled in by candidates. */
  effectivePublished: PriceList
  candidates: PriceList
}

type SoldItem = { itemType: SoldItemType; itemCode: string; cost: number; hasFloor: boolean }

/** Every sold item with its cost; `hasFloor` = carries the margin floor (not cases or coolers). */
function soldItems(catalog: Catalog): SoldItem[] {
  return [
    ...catalog.levels.map((l) => ({
      itemType: 'level' as const,
      itemCode: l.code,
      cost: l.partsCost,
      hasFloor: true,
    })),
    ...catalog.options.map((o) => ({
      itemType: 'option' as const,
      itemCode: o.code,
      cost: o.cost,
      hasFloor: o.type === 'ram' || o.type === 'ssd',
    })),
    {
      itemType: 'service' as const,
      itemCode: SERVICE_CODE,
      cost: catalog.settings.serviceCost,
      hasFloor: true,
    },
  ]
}

function priceIn(
  list: PriceList,
  item: Pick<SoldItem, 'itemType' | 'itemCode'>,
): number | undefined {
  if (item.itemType === 'service') return list.service
  return lookupPrice(item.itemType === 'level' ? list.level : list.option, item.itemCode)
}

function withPrice(list: PriceList, item: Pick<SoldItem, 'itemType' | 'itemCode'>, price: number) {
  if (item.itemType === 'service') list.service = price
  else if (item.itemType === 'level') list.level[item.itemCode] = price
  else list.option[item.itemCode] = price
}

function clonePrices(list: PriceList): PriceList {
  return { level: { ...list.level }, option: { ...list.option }, service: list.service }
}

/** What waits for approval after costs or settings changed. */
export function buildQueue(catalog: Catalog, snapshot: PriceSnapshot): QueueState {
  const { minMargin, publishThreshold } = catalog.settings
  const candidates = sellPrices(catalog)
  const items = soldItems(catalog)

  const effectivePublished: PriceList = { level: {}, option: {}, service: snapshot.service }
  for (const item of items) {
    withPrice(effectivePublished, item, priceIn(snapshot, item) ?? priceIn(candidates, item)!)
  }
  const publishedReview = reviewAll(costContext(catalog, effectivePublished))

  const queue: QueueItem[] = []
  let minorChanges = 0
  for (const item of items) {
    const published = priceIn(snapshot, item)
    const candidate = priceIn(candidates, item)!
    const reasons: QueueReason[] = []
    if (published === undefined) {
      reasons.push('new')
    } else {
      const change = (candidate - published) / published
      if (Math.abs(change) > publishThreshold) reasons.push('threshold')
      const ownMarginBroken = item.hasFloor && 1 - item.cost / published < minMargin
      const levelBroken =
        item.itemType === 'level' && Object.hasOwn(publishedReview.belowMinMargin, item.itemCode)
      if ((ownMarginBroken || levelBroken) && candidate !== published) reasons.push('urgent')
    }
    if (reasons.length === 0) {
      if (published !== undefined && candidate !== published) minorChanges++
      continue
    }
    queue.push({
      key: itemKey(item.itemType, item.itemCode),
      itemType: item.itemType,
      itemCode: item.itemCode,
      published: published ?? null,
      candidate,
      change: published === undefined ? null : (candidate - published) / published,
      reasons,
    })
  }
  // Urgent first, then new, then the rest; stable by code within a group.
  const rank = (i: QueueItem) =>
    i.reasons.includes('urgent') ? 0 : i.reasons.includes('new') ? 1 : 2
  queue.sort((a, b) => rank(a) - rank(b) || a.key.localeCompare(b.key))

  return {
    items: queue,
    minorChanges,
    publishedReview,
    brokenLevels: levelProblems(publishedReview, catalog, candidates),
    effectivePublished,
    candidates,
  }
}

/**
 * Prices on the site after approving the whole queue: the published ones with every queued item
 * at its candidate price. Minor changes stay at their published price — exactly what
 * `planPublication()` publishes when every queued key is selected (the Pulpit's „Po
 * zatwierdzeniu”, P2).
 */
export function pricesAfterQueue(queue: QueueState): PriceList {
  const prices = clonePrices(queue.effectivePublished)
  for (const item of queue.items) withPrice(prices, item, item.candidate)
  return prices
}

// --- Publication ---

export type PublishProblem =
  | { kind: 'nothing_selected' }
  | { kind: 'stale_queue'; keys: string[] }
  | LevelBelowMinProblem
  | { kind: 'no_compatible_config'; level: string }

/** How to lift a level back to the minimum margin — always something the panel can do. */
export type LevelFix =
  /** The level's new price from current costs is enough: tick it in the queue. */
  | { kind: 'approve'; candidate: number }
  /** Current costs do not give enough: raise "Wyjątek narzutu" of the level to at least this. */
  | { kind: 'markup'; markup: number }
  /** A cost or a price is missing: fix the data first. */
  | { kind: 'data' }

export type LevelBelowMinProblem = {
  kind: 'below_min_margin'
  level: string
  count: number
  worst: PricedConfig
  minLevelPrice: number | null
  fix: LevelFix
}

/**
 * The smallest "Wyjątek narzutu" (4 decimals, as typed in the panel) whose level price reaches
 * `minPrice` — checked with the same `sellLevel` publication uses, rounding included.
 */
export function minimalMarkup(
  level: CostLevel,
  settings: Catalog['settings'],
  minPrice: number,
): number {
  const white = level.color === 'biały' ? settings.whiteSurcharge : 0
  // sell = ceil(partsCost × (1 + m) + white) to the step: below this bound it cannot reach minPrice.
  const lower = (minPrice - settings.roundingStep - white) / level.partsCost - 1
  let markup = Math.max(0, Math.floor(lower * 1e4) / 1e4)
  while (sellLevel({ ...level, markupOverride: markup }, settings) < minPrice) {
    markup = Math.round((markup + 0.0001) * 1e4) / 1e4
  }
  return markup
}

/**
 * The guard's findings as problems with a fix. A level breaks the floor also when only a case or
 * cooler got dearer (their price often stays the same after rounding), so the queue can be empty —
 * then the fix is the level's markup, computed here.
 */
function levelProblems(
  review: Review,
  catalog: Catalog,
  candidates: PriceList,
): LevelBelowMinProblem[] {
  return Object.entries(review.belowMinMargin).map(([code, below]) => {
    const level = catalog.levels.find((l) => l.code === code)!
    const candidate = lookupPrice(candidates.level, code)
    let fix: LevelFix
    if (below.minLevelPrice === null || !(level.partsCost > 0)) {
      fix = { kind: 'data' }
    } else if (candidate !== undefined && candidate >= below.minLevelPrice) {
      fix = { kind: 'approve', candidate }
    } else {
      fix = { kind: 'markup', markup: minimalMarkup(level, catalog.settings, below.minLevelPrice) }
    }
    return { kind: 'below_min_margin' as const, level: code, ...below, fix }
  })
}

/**
 * Prices on the site after publishing the selected queue items (new items always go with them):
 * the published prices with those items at their candidate price. `count` = items published.
 */
export function selectionPrices(
  queue: QueueState,
  selectedKeys: readonly string[],
): { prices: PriceList; count: number } {
  const selected = new Set(selectedKeys)
  const toPublish = queue.items.filter((i) => selected.has(i.key) || i.reasons.includes('new'))
  const prices = clonePrices(queue.effectivePublished)
  for (const item of toPublish) withPrice(prices, item, item.candidate)
  return { prices, count: toPublish.length }
}

export type PublicationPlan =
  | {
      ok: true
      /** Every row of the new batch: levels, options, service, "price from". */
      rows: PriceRow[]
      /** Rows whose price differs from the current batch (or are new): `price-history`. */
      changes: PriceRow[]
      review: Review
    }
  | { ok: false; problems: PublishProblem[]; review: Review | null }

/**
 * Check the approved items with the margin guard and, when it passes, return the new batch.
 * Only item keys come from the panel; every price is computed here again.
 */
export function planPublication(
  catalog: Catalog,
  snapshot: PriceSnapshot,
  selectedKeys: readonly string[],
): PublicationPlan {
  const queue = buildQueue(catalog, snapshot)
  const queued = new Map(queue.items.map((i) => [i.key as string, i]))

  const stale = selectedKeys.filter((key) => !queued.has(key))
  if (stale.length > 0)
    return { ok: false, problems: [{ kind: 'stale_queue', keys: stale }], review: null }

  const { prices, count } = selectionPrices(queue, selectedKeys)
  if (count === 0) return { ok: false, problems: [{ kind: 'nothing_selected' }], review: null }

  const review = reviewAll(costContext(catalog, prices))
  const problems: PublishProblem[] = levelProblems(review, catalog, queue.candidates)
  for (const level of catalog.levels) {
    if (!review.priceFrom[level.code])
      problems.push({ kind: 'no_compatible_config', level: level.code })
  }
  if (problems.length > 0) return { ok: false, problems, review }

  const rows: PriceRow[] = [
    ...soldItems(catalog).map((item) => ({
      itemType: item.itemType,
      itemCode: item.itemCode,
      sellPrice: priceIn(prices, item)!,
      costAtPublish: item.cost,
    })),
    ...catalog.levels.map((level) => {
      const from = review.priceFrom[level.code]!
      return {
        itemType: 'level_from' as const,
        itemCode: level.code,
        sellPrice: from.price,
        costAtPublish: from.cost,
      }
    }),
  ]
  const before = (row: PriceRow): number | undefined =>
    row.itemType === 'level_from'
      ? lookupPrice(snapshot.levelFrom, row.itemCode)
      : priceIn(snapshot, { itemType: row.itemType, itemCode: row.itemCode })
  const changes = rows.filter((row) => before(row) !== row.sellPrice)

  return { ok: true, rows, changes, review }
}

/** The message the panel shows for a blocked publication (Polish, for the PRO-KOM staff). */
export function problemMessage(problem: PublishProblem, minMargin: number): string {
  switch (problem.kind) {
    case 'nothing_selected':
      return 'Nie zaznaczono żadnej pozycji do publikacji.'
    case 'stale_queue':
      return `Kolejka zmieniła się w międzyczasie (${problem.keys.join(', ')}) — odśwież stronę i zatwierdź jeszcze raz.`
    case 'no_compatible_config':
      return `Poziom ${problem.level} nie ma żadnej zgodnej konfiguracji — sprawdź aktywne opcje i reguły poziomu.`
    case 'below_min_margin': {
      const w = problem.worst
      const config = `${w.case} + ${w.cooler} + ${w.ram} + ${w.ssd}`
      const head =
        `Poziom ${problem.level}: ${problem.count} konfiguracji poniżej marży ${percent(minMargin)} ` +
        `(najgorsza: ${config}, ${zl(w.price)}, marża ${Number.isFinite(w.margin) ? percent(w.margin) : 'nieznana'}).`
      const fix = problem.fix
      switch (fix.kind) {
        case 'data':
          return `${head} Brakuje kosztu albo ceny — popraw dane w panelu.`
        case 'approve':
          return `${head} Zatwierdź nową cenę poziomu ${problem.level} (${zl(fix.candidate)}).`
        case 'markup':
          return (
            `${head} Z obecnych kosztów cena poziomu nie wystarczy: w „Poziomy mocy → ${problem.level}” ` +
            `ustaw „Wyjątek narzutu” na min. ${share(fix.markup)} (cena poziomu min. ` +
            `${zl(problem.minLevelPrice)}), potem zatwierdź poziom tutaj.`
          )
      }
    }
  }
}

// --- Builds overview ---

export type BuildRow = {
  slug: string
  name: string
  config: Config
  price: number | null
  cost: number | null
  margin: number | null
  /** Price change vs the previous batch; `null` without a previous batch. */
  change: number | null
}

/** Builds with today's published price, today's cost and margin (panel only, ADR-G002 §4.5). */
export function buildsOverview(
  builds: readonly { slug: string; name: string; config: Config }[],
  catalog: Catalog,
  published: PriceList,
  previous: PriceList | null,
): BuildRow[] {
  const ctx = costContext(catalog, published)
  const previousCtx = previous ? costContext(catalog, previous) : null
  return builds.map((b) => {
    const now = evaluate(b.config, ctx)
    const before = previousCtx ? evaluate(b.config, previousCtx) : null
    return {
      slug: b.slug,
      name: b.name,
      config: b.config,
      price: now?.price ?? null,
      cost: now?.cost ?? null,
      margin: now?.margin ?? null,
      change: now && before ? now.price - before.price : null,
    }
  })
}
