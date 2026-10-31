import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import {
  IN_WORKSHOP_STAGES,
  WORKSHOP_STAGES,
  workshopItems,
  type OrderStage,
  type WorkshopItem,
} from '@/lib/orders'

export type Workshop = {
  items: WorkshopItem[]
  /** Paid orders not shipped yet — „W warsztacie teraz: N komputerów” (board Main). */
  inWorkshop: number
}

export const EMPTY_WORKSHOP: Workshop = { items: [], inWorkshop: 0 }

/**
 * Items of the workshop strip (spec. §4 pt 2, ADR-G005): build name, creature and stage of current
 * orders — nothing else leaves the database. `orders` is staff-only, so the read is trusted and
 * picks only the stage and the build's public name.
 */
export async function loadWorkshop(now: Date = new Date()): Promise<Workshop> {
  const payload = await getPayload({ config })
  const [{ docs }, { totalDocs }] = await Promise.all([
    payload.find({
      collection: 'orders',
      where: { stage: { in: WORKSHOP_STAGES } },
      select: { stage: true, stageChangedAt: true, build: true },
      populate: { builds: { name: true, slug: true, creature: { key: true } } },
      sort: '-stageChangedAt',
      limit: 50,
      depth: 1,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'orders',
      where: { stage: { in: IN_WORKSHOP_STAGES } },
      overrideAccess: true,
    }),
  ])
  const items = workshopItems(
    docs.map((order) => ({
      stage: order.stage as OrderStage,
      stageChangedAt: order.stageChangedAt,
      build:
        typeof order.build === 'object' && order.build
          ? { name: order.build.name, slug: order.build.slug, key: order.build.creature.key }
          : null,
    })),
    now,
  )
  return { items, inWorkshop: totalDocs }
}
