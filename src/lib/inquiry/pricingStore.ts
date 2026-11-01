import 'server-only'

import type { Payload } from 'payload'

import type { CostLevel, CostOption } from '../pricing/catalog'
import { loadBatch, loadOffer } from '../pricing/store'
import type { CompatLevel, CompatOption } from '../pricing/types'
import type { Pricing } from './submit'

const publicLabels = async (
  payload: Payload,
  collection: 'power-levels' | 'options',
): Promise<Record<string, string>> => {
  const { docs } = await payload.find({
    collection,
    select: { code: true, publicLabel: true },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return Object.fromEntries(docs.map((doc) => [doc.code, doc.publicLabel]))
}

// The cost layer reads parts with costs; an inquiry keeps only what the rules and prices need,
// picked field by field — a cost field added later cannot slip through (ADR-G002 §8.7, review G6).
export const compatLevel = (l: CostLevel): CompatLevel => ({
  code: l.code,
  ramType: l.ramType,
  gpuLengthMm: l.gpuLengthMm,
  requiresAio: l.requiresAio,
  minRamGb: l.minRamGb,
  minSsdGb: l.minSsdGb,
  minCoolerClass: l.minCoolerClass,
  minCaseClass: l.minCaseClass,
})

export type InquiryOption = CompatOption & { active: boolean }

export function compatOption(o: CostOption): InquiryOption {
  const { code, active } = o
  switch (o.type) {
    case 'case':
      return {
        type: 'case',
        code,
        active,
        gpuMaxMm: o.gpuMaxMm,
        coolerMaxMm: o.coolerMaxMm,
        aio360: o.aio360,
        class: o.class,
      }
    case 'cooler':
      return {
        type: 'cooler',
        code,
        active,
        kind: o.kind,
        heightMm: o.heightMm,
        radiatorThicknessMm: o.radiatorThicknessMm,
        class: o.class,
      }
    case 'ram':
      return { type: 'ram', code, active, ramType: o.ramType, capacityGb: o.capacityGb }
    case 'ssd':
      return { type: 'ssd', code, active, capacityGb: o.capacityGb }
  }
}

/**
 * The offer without prices: compatibility data of every level and option, the build recipes and
 * the public labels. Shared by `submitInquiry()` and the build page („Dopasuj” offers exactly what
 * the inquiry accepts) — the build page needs it even before any price batch exists.
 */
export async function loadInquiryOffer(payload: Payload): Promise<Omit<Pricing, 'snapshot'>> {
  const [offer, level, option] = await Promise.all([
    loadOffer(payload),
    publicLabels(payload, 'power-levels'),
    publicLabels(payload, 'options'),
  ])
  return {
    offer: {
      levels: offer.catalog.levels.map(compatLevel),
      options: offer.catalog.options.map(compatOption),
      // Drafts and hidden builds cannot be asked for (panel spec §9): `loadOffer` reads all of
      // them for the panel, bypassing the collection's read filter.
      builds: offer.builds
        .filter((b) => b.offerStatus === 'published')
        .map(({ id, slug, name, config }) => ({ id, slug, name, config })),
    },
    labels: { level, option },
  }
}

/**
 * Offer and newest published prices for `submitInquiry()` — the same mapping of codes to parts as
 * the price screen (`lib/pricing/store`). `null` while no batch is published.
 */
export async function loadInquiryPricing(payload: Payload): Promise<Pricing | null> {
  const [data, batch] = await Promise.all([loadInquiryOffer(payload), loadBatch(payload)])
  if (!batch) return null
  return { ...data, snapshot: batch.snapshot }
}
