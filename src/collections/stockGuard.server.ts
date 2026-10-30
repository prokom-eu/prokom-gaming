import 'server-only'

import type { Payload } from 'payload'

import { costContext } from '../lib/pricing/cost'
import { checkStockUnit, type StockCheck } from '../lib/pricing/stock'
import { loadBatch, loadOffer } from '../lib/pricing/store'
import type { Config } from '../lib/pricing/types'

const KEYS = ['level', 'case', 'cooler', 'ram', 'ssd'] as const

export type StockChanges = Partial<Record<(typeof KEYS)[number], string | null>>

/** The unit's configuration: its build's recipe with the panel's non-empty changes. */
export function unitConfig(recipe: Config, changes: StockChanges | null | undefined): Config {
  const config: Config = { ...recipe }
  for (const key of KEYS) {
    const code = changes?.[key]?.trim()
    if (code) config[key] = code
  }
  return config
}

/**
 * The unit checked against the newest published prices and current costs. Loaded lazily by the
 * `stock` hook: the cost layer must stay out of the config the Payload CLI loads.
 */
export async function guardStockUnit(
  payload: Payload,
  unit: { buildId: number; changes: StockChanges | null | undefined },
  discount: number | null | undefined,
): Promise<StockCheck> {
  const [offer, batch] = await Promise.all([loadOffer(payload), loadBatch(payload)])
  if (!batch) {
    return { ok: false, path: 'build', message: 'Nie ma opublikowanych cen — najpierw opublikuj.' }
  }
  const build = offer.builds.find((b) => b.id === unit.buildId)
  if (!build) return { ok: false, path: 'build', message: 'Nie ma takiego zestawu.' }
  return checkStockUnit(
    { config: unitConfig(build.config, unit.changes), discount },
    costContext(offer.catalog, batch.snapshot),
  )
}
