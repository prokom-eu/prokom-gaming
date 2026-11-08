import 'server-only'

import type { CostOption, PricingSettingsInput } from '../../lib/pricing/catalog'
import { markupFloor, sellOption } from '../../lib/pricing/cost'
import { lookupPrice, type PriceList } from '../../lib/pricing/snapshot'

/** „Cena na stronie: 430 zł” of the „Dodaj …” panel (panel spec §10, board Opcje). */
export type OptionPreview = {
  price: number
  /** „koszt + 20 zł, w górę do 10 zł” — how the price list got there. */
  rule: string
  /** Against the cheapest option of the same kind on the site (class for cases and coolers). */
  versus: { label: string; amount: number } | null
}

type Other = { code: string; label: string; option: CostOption }

const pct = (v: number) => `${Math.round(v * 1000) / 10}`.replace('.', ',')

/** Same price as publication (`sellOption`); the comparison only with published, active options. */
export function optionPreview(
  option: CostOption,
  settings: PricingSettingsInput,
  others: readonly Other[],
  published: PriceList,
): OptionPreview {
  const price = sellOption(option, settings)
  const markup = settings.categoryMarkup[option.type]
  const step = `w górę do ${settings.roundingStep} zł`
  const rule =
    option.type === 'case' || option.type === 'cooler'
      ? `koszt${markup > 0 ? ` + ${pct(markup)}%` : ''} + ${settings.caseCoolerBuffer} zł, ${step}`
      : `koszt + ${pct(Math.max(markup, markupFloor(settings)))}%, ${step}`

  const same = (o: CostOption) => {
    if (!o.active || o.type !== option.type) return false
    if ((o.type === 'case' || o.type === 'cooler') && 'class' in option) {
      return o.class === option.class
    }
    if (o.type === 'ram' && option.type === 'ram') return o.ramType === option.ramType
    return true
  }
  let cheapest: { label: string; price: number } | null = null
  for (const other of others) {
    if (!same(other.option)) continue
    const p = lookupPrice(published.option, other.code)
    if (p === undefined) continue
    if (!cheapest || p < cheapest.price) cheapest = { label: other.label, price: p }
  }
  return {
    price,
    rule,
    versus: cheapest ? { label: cheapest.label, amount: price - cheapest.price } : null,
  }
}
