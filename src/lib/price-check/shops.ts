import type { Payload } from 'payload'

import { shopsOf } from '../../globals/PriceCheckSettings'

/** Shops of `price-check-settings` (or the start list): the only hosts offer links may use. */
export async function allowedShops(payload: Payload): Promise<string[]> {
  const settings = await payload
    .findGlobal({ slug: 'price-check-settings', depth: 0, overrideAccess: true })
    .catch(() => null)
  return shopsOf(settings)
}
