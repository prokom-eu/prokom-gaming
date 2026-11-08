import { describe, expect, it, vi } from 'vitest'

import { sellPrices } from '../pricing/cost'
import { seedCatalog } from '../pricing/testing/seedCatalog'

const catalog = seedCatalog()

vi.mock('../pricing/store', () => ({
  loadOffer: async () => ({
    // A cost-like field added later must not slip through: the loader picks fields explicitly.
    catalog: {
      ...catalog,
      levels: catalog.levels.map((l) => ({ ...l, futureCost: 1 })),
      options: catalog.options.map((o) => ({ ...o, futureCost: 1 })),
    },
    builds: (['published', 'draft', 'hidden'] as const).map((offerStatus, i) => ({
      id: i + 1,
      slug: offerStatus,
      name: offerStatus,
      offerStatus,
      config: { level: 'P01', case: 'C', cooler: 'K', ram: 'R', ssd: 'S' },
    })),
  }),
  loadBatch: async () => ({
    snapshot: {
      ...sellPrices(catalog),
      batch: 1,
      publishedAt: '2026-10-25T00:00:00Z',
      levelFrom: {},
    },
    publishedBy: null,
  }),
}))

describe('loadInquiryPricing', () => {
  it('keeps only rule fields: no cost, markup or future field reaches the inquiry', async () => {
    const { loadInquiryPricing } = await import('./pricingStore')
    const payload = { find: async () => ({ docs: [] }) }
    const pricing = await loadInquiryPricing(payload as never)
    const text = JSON.stringify(pricing?.offer)
    for (const key of ['cost', 'partsCost', 'markupClass', 'markupOverride', 'futureCost']) {
      expect(text).not.toContain(`"${key}":`)
    }
    expect(pricing?.offer.levels).toHaveLength(catalog.levels.length)
    expect(pricing?.offer.options).toHaveLength(catalog.options.length)
  })

  it('offers published builds only: a draft or hidden build cannot be asked for (P6)', async () => {
    const { loadInquiryPricing } = await import('./pricingStore')
    const payload = { find: async () => ({ docs: [] }) }
    const pricing = await loadInquiryPricing(payload as never)
    expect(pricing?.offer.builds.map((b) => b.slug)).toEqual(['published'])
    expect(JSON.stringify(pricing?.offer.builds)).not.toContain('offerStatus')
  })
})
