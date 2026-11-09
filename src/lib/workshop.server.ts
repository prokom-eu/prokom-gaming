import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { IN_WORKSHOP_STAGES } from '@/lib/orders'

/**
 * Paid orders not shipped yet — the line „W warsztacie teraz: N komputerów” in „Zanim wyjedzie”
 * (board Main). Only a number leaves the database. The public strip of orders under the hero is
 * gone for good (ADR-G015).
 */
export async function loadInWorkshopCount(): Promise<number> {
  const payload = await getPayload({ config })
  const { totalDocs } = await payload.count({
    collection: 'orders',
    where: { stage: { in: IN_WORKSHOP_STAGES } },
    overrideAccess: true,
  })
  return totalDocs
}
