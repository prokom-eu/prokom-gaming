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

type Unit = { buildId: number; changes: StockChanges | null | undefined; discount?: number | null }

/**
 * A checker of units against the newest published prices and current costs, loaded once for many
 * units (ADR-G002 §7, addendum 30.10.2026). Used by the panel hook on save and by the site on every
 * read and reservation: a unit whose margin fell under the minimum after a new price batch or a
 * cost change is neither shown nor sold. Server-only: costs never leave the server.
 */
export async function stockChecker(payload: Payload): Promise<(unit: Unit) => StockCheck> {
  const [offer, batch] = await Promise.all([loadOffer(payload), loadBatch(payload)])
  if (!batch) {
    return () => ({
      ok: false,
      path: 'build',
      message: 'Nie ma opublikowanych cen — najpierw opublikuj.',
    })
  }
  const ctx = costContext(offer.catalog, batch.snapshot)
  return (unit) => {
    const build = offer.builds.find((b) => b.id === unit.buildId)
    if (!build) return { ok: false, path: 'build', message: 'Nie ma takiego zestawu.' }
    return checkStockUnit(
      { config: unitConfig(build.config, unit.changes), discount: unit.discount },
      ctx,
    )
  }
}

/** One unit (the panel hook). */
export async function guardStockUnit(payload: Payload, unit: Unit): Promise<StockCheck> {
  return (await stockChecker(payload))(unit)
}
