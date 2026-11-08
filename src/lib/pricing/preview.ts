import 'server-only'

import type { Catalog } from './catalog'
import { costContext, evaluate } from './cost'
import {
  buildQueue,
  buildsOverview,
  planPublication,
  problemMessage,
  selectionPrices,
} from './publish'
import type { PriceList, PriceSnapshot } from './snapshot'
import type { Config } from './types'
import type { WhatIfBuild } from './whatIf'

type BuildRecipe = { slug: string; name: string; config: Config }

/** „Co zobaczy klient” (panel spec §8): the ready builds after the publication. */
export type ClientView = {
  dearer: number
  cheaper: number
  same: number
  /** Simple average of the build margins after publication, at today's costs. */
  averageMargin: number | null
  /** The largest price change of a build in zł (signed, by absolute value). */
  biggestChange: number | null
}

/** The live guard of „Do zatwierdzenia” for one selection of queue items. */
export type PublicationPreview = {
  ok: boolean
  /** Why publication is blocked (the guard's messages, the same as on publishing). */
  messages: string[]
  /** Items that would be published (selected + new). */
  count: number
  compatible: number | null
  lowest: { margin: number; config: Config } | null
  client: ClientView
}

/**
 * The guard for a selection, before anything is saved: `planPublication()` (the function that
 * publishes) says whether it may go, the builds are priced at the prices it would publish.
 */
export function previewPublication(
  catalog: Catalog,
  snapshot: PriceSnapshot,
  builds: readonly BuildRecipe[],
  selectedKeys: readonly string[],
): PublicationPreview {
  const queue = buildQueue(catalog, snapshot)
  const { prices, count } = selectionPrices(queue, selectedKeys)
  const plan = planPublication(catalog, snapshot, selectedKeys)
  const review = plan.review
  const minMargin = catalog.settings.minMargin
  return {
    ok: plan.ok,
    messages: plan.ok ? [] : plan.problems.map((p) => problemMessage(p, minMargin)),
    count,
    compatible: review?.compatible ?? null,
    lowest: review?.minMargin
      ? {
          margin: review.minMargin.margin,
          config: {
            level: review.minMargin.level,
            case: review.minMargin.case,
            cooler: review.minMargin.cooler,
            ram: review.minMargin.ram,
            ssd: review.minMargin.ssd,
          },
        }
      : null,
    client: clientView(builds, catalog, prices, queue.effectivePublished),
  }
}

export function clientView(
  builds: readonly BuildRecipe[],
  catalog: Catalog,
  after: PriceList,
  before: PriceList,
): ClientView {
  const rows = buildsOverview(builds, catalog, after, before)
  let dearer = 0
  let cheaper = 0
  let same = 0
  let biggest: number | null = null
  let sum = 0
  let counted = 0
  for (const row of rows) {
    if (row.margin !== null) {
      sum += row.margin
      counted++
    }
    if (row.change === null) continue
    if (row.change > 0) dearer++
    else if (row.change < 0) cheaper++
    else same++
    if (biggest === null || Math.abs(row.change) > Math.abs(biggest)) biggest = row.change
  }
  return {
    dearer,
    cheaper,
    same,
    averageMargin: counted > 0 ? sum / counted : null,
    biggestChange: biggest,
  }
}

/** Costs of one power level's parts by role (from the level documents). */
export type LevelParts = ReadonlyMap<string, readonly { role: string; cost: number }[]>

/**
 * Data of „Co jeśli?”: each build's price on the site today and its cost split into the slider
 * groups. Cases and coolers count with motherboards and PSUs as „reszta”; the service is fixed.
 * Builds without a published price or with unknown codes are left out.
 */
export function whatIfBuilds(
  builds: readonly BuildRecipe[],
  catalog: Catalog,
  published: PriceList,
  levelParts: LevelParts,
): WhatIfBuild[] {
  const ctx = costContext(catalog, published)
  const option = new Map(catalog.options.map((o) => [o.code, o.cost]))
  const result: WhatIfBuild[] = []
  for (const build of builds) {
    const priced = evaluate(build.config, ctx)
    const parts = levelParts.get(build.config.level)
    if (!priced || !parts) continue
    const byRole = (role: string) =>
      parts.filter((p) => p.role === role).reduce((sum, p) => sum + p.cost, 0)
    const costs = {
      cpu: byRole('cpu'),
      gpu: byRole('gpu'),
      ram: option.get(build.config.ram) ?? 0,
      ssd: option.get(build.config.ssd) ?? 0,
      rest:
        byRole('mobo') +
        byRole('psu') +
        (option.get(build.config.case) ?? 0) +
        (option.get(build.config.cooler) ?? 0),
      fixed: catalog.settings.serviceCost,
    }
    result.push({ name: build.name, price: priced.price, costs })
  }
  return result
}

/** „P01 + H9 + KRAKEN + R16D4 + PXL512” — the weakest configuration as on the board. */
export const configLabel = (c: Config): string =>
  `${c.level} + ${c.case} + ${c.cooler} + ${c.ram} + ${c.ssd}`
