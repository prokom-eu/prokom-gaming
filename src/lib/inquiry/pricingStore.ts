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
const compatLevel = (l: CostLevel): CompatLevel => ({
  code: l.code,
  ramType: l.ramType,
  gpuLengthMm: l.gpuLengthMm,
  requiresAio: l.requiresAio,
  minRamGb: l.minRamGb,
  minSsdGb: l.minSsdGb,
  minCoolerClass: l.minCoolerClass,
  minCaseClass: l.minCaseClass,
})

type InquiryOption = CompatOption & { active: boolean }

function compatOption(o: CostOption): InquiryOption {
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
 * Offer and newest published prices for `submitInquiry()` — the same mapping of codes to parts as
 * the price screen (`lib/pricing/store`). `null` while no batch is published.
 */
export async function loadInquiryPricing(payload: Payload): Promise<Pricing | null> {
  const [offer, batch, level, option] = await Promise.all([
    loadOffer(payload),
    loadBatch(payload),
    publicLabels(payload, 'power-levels'),
    publicLabels(payload, 'options'),
  ])
  if (!batch) return null
  return {
    offer: {
      levels: offer.catalog.levels.map(compatLevel),
      options: offer.catalog.options.map(compatOption),
      builds: offer.builds,
    },
    snapshot: batch.snapshot,
    labels: { level, option },
  }
}
