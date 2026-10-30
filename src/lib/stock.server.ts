import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { stockChecker } from '@/collections/stockGuard.server'
import { loadInquiryPricing } from '@/lib/inquiry/pricingStore'
import { log } from '@/lib/logger'
import { loadOffer } from '@/lib/offer.server'
import { stockCards, type StockCard, type StockUnitInput } from '@/lib/stock'

const CODE_KEYS = ['level', 'case', 'cooler', 'ram', 'ssd'] as const

/**
 * Units of `/gotowe`, cheapest first. `stock` is panel-only, so units are read trusted — active
 * ones only, picked field by field; builds and labels come from the public offer, prices from the
 * newest batch. A unit whose margin fell under the minimum is left out (ADR-G002 §7).
 */
export async function loadStockCards(): Promise<StockCard[]> {
  const payload = await getPayload({ config })
  const [offer, pricing, check, units] = await Promise.all([
    loadOffer(payload),
    loadInquiryPricing(payload),
    stockChecker(payload),
    payload.find({
      collection: 'stock',
      where: { active: { equals: true } },
      select: {
        build: true,
        changes: true,
        location: true,
        conditionNote: true,
        discount: true,
        reservedUntil: true,
      },
      populate: { builds: { slug: true } },
      overrideAccess: true,
      depth: 1,
      pagination: false,
    }),
  ])
  if (!pricing) return []

  const inputs: StockUnitInput[] = units.docs.flatMap((doc) => {
    const build = typeof doc.build === 'object' && doc.build ? doc.build : null
    if (!build) return []
    const margin = check({ buildId: build.id, changes: doc.changes, discount: doc.discount })
    if (!margin.ok) {
      log.warn({ stock: doc.id, reason: margin.path }, 'stock unit hidden: guard refuses it')
      return []
    }
    const buildSlug = build.slug
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
