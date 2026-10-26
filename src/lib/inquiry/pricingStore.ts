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
// so no cost can end up in a record or an e-mail by mistake (ADR-G002 §8.7).
const compatLevel = ({
  color: _c,
  markupClass: _m,
  markupOverride: _o,
  partsCost: _p,
  ...level
}: CostLevel): CompatLevel => level
const compatOption = ({ cost: _cost, ...option }: CostOption): CompatOption & { active: boolean } =>
  option

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
