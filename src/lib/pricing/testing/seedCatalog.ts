/**
 * Tests only: the seed offer as a cost catalog, mapped exactly like the documents the seed writes
 * to the database (`seed/offer.ts`), so tests price the same data the panel will.
 */
import { mapOption, mapPowerLevel, mapPricingSettings, seed } from '../../../seed/offer'
import { toCatalog, type Catalog } from '../catalog'

export function seedCatalog(): Catalog {
  return toCatalog(
    seed.levels.map(mapPowerLevel),
    seed.options.map((o) => mapOption(o, null)),
    mapPricingSettings(seed.pricingSettings),
  )
}
