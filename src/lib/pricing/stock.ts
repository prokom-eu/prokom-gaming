import 'server-only'

import { stockPrice } from '../stock'
import { evaluate, margin, type CostContext } from './cost'
import type { Config } from './types'

export type StockCheck =
  | { ok: true; price: number; margin: number }
  | { ok: false; path: 'build' | 'config' | 'discount'; message: string }

const pct = (value: number) => `${(value * 100).toFixed(1).replace('.', ',')}%`

/**
 * Margin guard of a „Gotowe od ręki” unit (ADR-G002 §7, addendum 30.10.2026): the configuration
 * must be priceable and compatible, and its price minus the unit's discount must keep
 * `minMargin` over the parts' cost. Runs in the panel only — costs never leave the server.
 */
export function checkStockUnit(
  input: { config: Config; discount: number | null | undefined },
  ctx: CostContext,
): StockCheck {
  const evaluation = evaluate(input.config, ctx)
  if (!evaluation) {
    return {
      ok: false,
      path: 'config',
      message: 'Konfiguracja ma kod bez opublikowanej ceny albo nieistniejący. Popraw kody.',
    }
  }
  if (evaluation.errors.length > 0) {
    return {
      ok: false,
      path: 'config',
      message: `Części do siebie nie pasują (${evaluation.errors.join(', ')}).`,
    }
  }
  const price = stockPrice(evaluation.price, input.discount)
  if (price === null) {
    return { ok: false, path: 'discount', message: 'Rabat nie może być równy cenie ani wyższy.' }
  }
  const unitMargin = margin(price, evaluation.cost)
  const min = ctx.catalog.settings.minMargin
  if (unitMargin < min) {
    return {
      ok: false,
      path: 'discount',
      message: `Za duży rabat: marża egzemplarza ${pct(unitMargin)}, minimum ${pct(min)}.`,
    }
  }
  return { ok: true, price, margin: unitMargin }
}
