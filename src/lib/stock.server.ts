import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { loadInquiryPricing } from '@/lib/inquiry/pricingStore'
import { loadOffer } from '@/lib/offer.server'
import { stockCards, type StockCard, type StockUnitInput } from '@/lib/stock'

const CODE_KEYS = ['level', 'case', 'cooler', 'ram', 'ssd'] as const

/**
 * Units of `/gotowe`, cheapest first. Units are read as the visitor (only `active` ones pass the
 * access rule); builds and labels come from the public offer, prices from the newest batch.
 */
export async function loadStockCards(): Promise<StockCard[]> {
  const payload = await getPayload({ config })
  const [offer, pricing, units] = await Promise.all([
    loadOffer(payload),
    loadInquiryPricing(payload),
    payload.find({
      collection: 'stock',
      select: {
        build: true,
        changes: true,
        location: true,
        conditionNote: true,
        discount: true,
        reservedUntil: true,
      },
      populate: { builds: { slug: true } },
      overrideAccess: false,
      depth: 1,
      pagination: false,
    }),
  ])
  if (!pricing) return []

  const inputs: StockUnitInput[] = units.docs.flatMap((doc) => {
    const buildSlug = typeof doc.build === 'object' && doc.build ? doc.build.slug : null
    if (!buildSlug) return []
    const changes: StockUnitInput['changes'] = {}
    for (const key of CODE_KEYS) {
      const code = doc.changes?.[key]?.trim()
      if (code) changes[key] = code
    }
    return [
      {
        id: doc.id,
        buildSlug,
        changes,
        location: doc.location,
        conditionNote: doc.conditionNote,
        discount: doc.discount ?? 0,
        reservedUntil: doc.reservedUntil ?? null,
      },
    ]
  })

  return stockCards({
    units: inputs,
    builds: offer.hero.builds,
    offer: pricing.offer,
    snapshot: pricing.snapshot,
    optionLabels: pricing.labels.option,
    now: Date.now(),
  }).sort((a, b) => a.price - b.price)
}
