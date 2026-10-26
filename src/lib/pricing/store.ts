import 'server-only'

import { commitTransaction, createLocalReq, initTransaction, killTransaction } from 'payload'
import type { Payload } from 'payload'

import type { User } from '../../payload-types'
import { toCatalog, type Catalog } from './catalog'
import type { PublicationPlan } from './publish'
import { snapshotFromRows, type PriceSnapshot } from './snapshot'
import type { Config } from './types'

/**
 * Database side of price publication (ADR-G002 §2, §4): reads the offer with costs and the price
 * batches, writes a new batch with its price history in one transaction. Server-only. Callers
 * check the panel user first — every call here bypasses access control.
 */

const trusted = { overrideAccess: true, depth: 0, pagination: false } as const

export type OfferData = {
  catalog: Catalog
  builds: { slug: string; name: string; config: Config }[]
}

/** Levels, options (active or not), pricing settings and the builds as code recipes. */
export async function loadOffer(payload: Payload): Promise<OfferData> {
  const [levels, options, builds, settings] = await Promise.all([
    payload.find({ collection: 'power-levels', sort: 'code', ...trusted }),
    payload.find({ collection: 'options', sort: 'code', ...trusted }),
    payload.find({ collection: 'builds', sort: 'name', ...trusted }),
    payload.findGlobal({ slug: 'pricing-settings', overrideAccess: true, depth: 0 }),
  ])

  const levelCode = new Map(levels.docs.map((l) => [l.id, l.code]))
  const optionCode = new Map(options.docs.map((o) => [o.id, o.code]))
  const code = (map: Map<number, string>, ref: number | { id: number }, what: string): string => {
    const id = typeof ref === 'number' ? ref : ref.id
    const found = map.get(id)
    if (!found) throw new Error(`Zestaw wskazuje nieistniejący ${what} (id ${id}).`)
    return found
  }

  return {
    catalog: toCatalog(levels.docs, options.docs, settings),
    builds: builds.docs.map((b) => ({
      slug: b.slug,
      name: b.name,
      config: {
        level: code(levelCode, b.level, 'poziom'),
        case: code(optionCode, b.case, 'obudowę'),
        cooler: code(optionCode, b.cooler, 'chłodzenie'),
        ram: code(optionCode, b.ram, 'RAM'),
        ssd: code(optionCode, b.ssd, 'dysk'),
      },
    })),
  }
}

export type BatchInfo = { snapshot: PriceSnapshot; publishedBy: string | null }

/** One batch (default: the newest). `null` when there is no such batch. */
export async function loadBatch(payload: Payload, batch?: number): Promise<BatchInfo | null> {
  let number = batch
  if (number === undefined) {
    const newest = await payload.find({
      collection: 'published-prices',
      sort: '-batch',
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })
    number = newest.docs[0]?.batch
    if (number === undefined) return null
  }
  const rows = await payload.find({
    collection: 'published-prices',
    where: { batch: { equals: number } },
    ...trusted,
    depth: 1,
  })
  if (rows.docs.length === 0) return null
  const by = rows.docs[0]!.publishedBy
  return {
    snapshot: snapshotFromRows(rows.docs),
    publishedBy: by && typeof by === 'object' ? (by as User).email : null,
  }
}

/**
 * Write an approved publication: batch N+1 with every row, and for each changed price close the
 * open `price-history` entry and open a new one. All or nothing — a half-written batch would
 * become "the newest" on the site. Two publications at once fail on the unique batch index.
 */
export async function writeBatch(
  payload: Payload,
  plan: Extract<PublicationPlan, { ok: true }>,
  user: User,
): Promise<{ batch: number; publishedAt: string }> {
  const req = await createLocalReq({ user: { ...user, collection: 'users' } }, payload)
  await initTransaction(req)
  try {
    const newest = await payload.find({
      collection: 'published-prices',
      sort: '-batch',
      limit: 1,
      overrideAccess: true,
      depth: 0,
      req,
    })
    const batch = (newest.docs[0]?.batch ?? 0) + 1
    const publishedAt = new Date().toISOString()

    for (const row of plan.rows) {
      await payload.create({
        collection: 'published-prices',
        data: { batch, ...row, publishedAt, publishedBy: user.id },
        overrideAccess: true,
        depth: 0,
        req,
      })
    }
    for (const row of plan.changes) {
      await payload.update({
        collection: 'price-history',
        where: {
          and: [
            { itemType: { equals: row.itemType } },
            { itemCode: { equals: row.itemCode } },
            { validTo: { exists: false } },
          ],
        },
        data: { validTo: publishedAt },
        overrideAccess: true,
        depth: 0,
        req,
      })
      await payload.create({
        collection: 'price-history',
        data: {
          batch,
          itemType: row.itemType,
          itemCode: row.itemCode,
          sellPrice: row.sellPrice,
          validFrom: publishedAt,
        },
        overrideAccess: true,
        depth: 0,
        req,
      })
    }
    await commitTransaction(req)
    return { batch, publishedAt }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}
