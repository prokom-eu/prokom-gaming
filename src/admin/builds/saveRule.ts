import type { OfferStatus } from './load'

/**
 * What „Zapisz” in the build editor may do (panel spec §9, decision P0) — a pure rule, tested:
 * - a build that will be on the site needs every item priced (no published price = blocked);
 * - a build that will be on the site with a price other than today's on the site (or coming back
 *   from draft/hidden) needs the confirmation of exactly that price;
 * - a draft or hidden build saves at once, priced or not (taking a build off the site must
 *   always be possible).
 */
export type SaveDecision =
  { kind: 'save' } | { kind: 'confirm'; from: number | null; to: number } | { kind: 'no-price' }

export function saveDecision(input: {
  /** Status of the build now and the one being saved. */
  current: OfferStatus
  next: OfferStatus
  /** Price of the saved recipe on the site today (`null` = an item without a published price). */
  before: number | null
  price: number | null
  confirmedPrice: number | null
}): SaveDecision {
  const { current, next, before, price, confirmedPrice } = input
  if (next !== 'published') return { kind: 'save' }
  if (price === null) return { kind: 'no-price' }
  const changes = current !== 'published' || before !== price
  if (changes && confirmedPrice !== price) {
    return { kind: 'confirm', from: current === 'published' ? before : null, to: price }
  }
  return { kind: 'save' }
}
