import { priceComputer, type InquiryOffer } from './inquiry/price'
import type { PriceSnapshot } from './pricing/snapshot'

/**
 * „Gotowe od ręki” (spec. §11, ADR-G005 `stock`): vocabulary and the rules that do not need costs.
 * The price of a unit = price of its configuration from the newest published batch minus the
 * unit's own discount (ADR-G002 §7, addendum 30.10.2026); the panel guards the margin.
 */

export const STOCK_LOCATIONS = [
  { value: 'rabka', label: 'Rabka-Zdrój', badge: 'wysyłka w 1–2 dni robocze' },
] as const
export type StockLocation = (typeof STOCK_LOCATIONS)[number]['value']

export const STOCK_CONDITIONS = [
  { value: 'new', label: 'Nowy' },
  { value: 'demo', label: 'Pokazowy' },
  { value: 'returned', label: 'Po zwrocie' },
] as const

/** `context` flag of writes that change no price (reservation, seed): the margin guard skips them. */
export const SKIP_STOCK_GUARD = 'skipStockGuard'

/** A reservation from „Zarezerwuj” holds the unit for 24 hours (spec. §11). */
export const RESERVATION_MS = 24 * 60 * 60 * 1000

/** Reserved now: `reservedUntil` is in the future. */
export function isReserved(reservedUntil: string | null | undefined, now: number): boolean {
  if (!reservedUntil) return false
  const until = Date.parse(reservedUntil)
  return Number.isFinite(until) && until > now
}

/** Price of the unit; `null` when the discount would eat the whole price. */
export function stockPrice(
  configPrice: number,
  discount: number | null | undefined,
): number | null {
  const off = Math.max(0, discount ?? 0)
  const price = configPrice - off
  return price > 0 ? price : null
}

export const locationOf = (value: string) => STOCK_LOCATIONS.find((l) => l.value === value)

/** A unit as the server reads it for the site (public fields only). */
export type StockUnitInput = {
  id: number
  buildSlug: string
  changes: Partial<Record<'level' | 'case' | 'cooler' | 'ram' | 'ssd', string>>
  location: string
  conditionNote: string
  discount: number
  reservedUntil: string | null
}

/** The build as `/zestawy` shows it (`HeroBuild` fields the card needs). */
export type StockBuildInput = {
  slug: string
  name: string
  key: string
  cpu: string | null
  gpu: string | null
  ram: string | null
  disk: string | null
  photo: { src: string; alt: string } | null
}

export type StockCard = {
  id: number
  name: string
  /** Scene and sigil key, colour token `--c-<slug>`. */
  key: string
  slug: string
  location: string
  badge: string
  specs: string
  conditionNote: string
  price: number
  photo: { src: string; alt: string } | null
}

/**
 * Cards of `/gotowe`: free units (not reserved now) whose configuration is priced from the newest
 * batch — price minus the unit's discount, the same rule as `submitInquiry` for type `ready`.
 * Parts of the build's recipe; a changed RAM or disk shows its public label, a changed level or
 * case drops the parts line or the photo rather than show the recipe's.
 */
export function stockCards(input: {
  units: readonly StockUnitInput[]
  builds: readonly StockBuildInput[]
  offer: InquiryOffer
  snapshot: PriceSnapshot
  optionLabels: Record<string, string>
  now: number
}): StockCard[] {
  return input.units.flatMap((unit) => {
    if (isReserved(unit.reservedUntil, input.now)) return []
    const build = input.builds.find((b) => b.slug === unit.buildSlug)
    const location = locationOf(unit.location)
    if (!build || !location) return []
    const priced = priceComputer(
      { build: unit.buildSlug, config: unit.changes },
      input.offer,
      input.snapshot,
    )
    const price = priced.ok ? stockPrice(priced.price, unit.discount) : null
    if (!priced.ok || price === null) return []
    const label = (key: 'ram' | 'ssd', recipe: string | null) =>
      unit.changes[key] ? (input.optionLabels[priced.config[key]] ?? null) : recipe
    const parts = unit.changes.level ? [] : [build.cpu, build.gpu]
    const specs = [...parts, label('ram', build.ram), label('ssd', build.disk)]
      .filter(Boolean)
      .join(', ')
    return [
      {
        id: unit.id,
        name: build.name,
        key: build.key,
        slug: build.slug,
        location: location.label,
        badge: location.badge,
        specs,
        conditionNote: unit.conditionNote,
        price,
        photo: unit.changes.case ? null : build.photo,
      },
    ]
  })
}
