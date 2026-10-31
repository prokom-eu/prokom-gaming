import 'server-only'

import { commitTransaction, createLocalReq, initTransaction, killTransaction } from 'payload'
import type { Payload } from 'payload'

import type { User } from '../../payload-types'
import { CatalogError, toCatalog, type Catalog } from './catalog'
import type { CostChange, ImportLevel, ImportOption } from './csv'
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
  builds: { id: number; slug: string; name: string; config: Config }[]
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
    if (!found) throw new CatalogError(`Zestaw wskazuje nieistniejący ${what} (id ${id}).`)
    return found
  }

  return {
    catalog: toCatalog(levels.docs, options.docs, settings),
    builds: builds.docs.map((b) => ({
      id: b.id,
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
  const number = batch ?? (await newestBatchNumber(payload))
  if (number === undefined) return null
  const rows = await payload.find({
    collection: 'published-prices',
    where: { batch: { equals: number } },
    ...trusted,
  })
  const first = rows.docs[0]
  if (!first) return null

  let snapshot: PriceSnapshot
  try {
    snapshot = snapshotFromRows(rows.docs)
  } catch (error) {
    // A broken batch in the database is a data error: the panel shows it as a message.
    throw new CatalogError(`Partia ${number}: ${error instanceof Error ? error.message : error}`)
  }
  // The author once, not populated into each of the 90 rows.
  const author =
    typeof first.publishedBy === 'number'
      ? await payload
          .findByID({
            collection: 'users',
            id: first.publishedBy,
            select: { email: true },
            overrideAccess: true,
            depth: 0,
            disableErrors: true,
          })
          .catch(() => null)
      : null
  return { snapshot, publishedBy: author?.email ?? null }
}

async function newestBatchNumber(
  payload: Payload,
  req?: Parameters<Payload['find']>[0]['req'],
): Promise<number | undefined> {
  const newest = await payload.find({
    collection: 'published-prices',
    sort: '-batch',
    limit: 1,
    overrideAccess: true,
    depth: 0,
    req,
  })
  return newest.docs[0]?.batch
}

/** Someone else published since the screen (and the plan) read the current batch. */
export class StalePublicationError extends Error {
  constructor(basedOn: number, newest: number | undefined) {
    super(`Price batch ${basedOn} is no longer the newest (${newest ?? 'none'}).`)
    this.name = 'StalePublicationError'
  }
}

/**
 * Write an approved publication: batch `basedOn + 1` with every row, and for each changed price
 * close the open `price-history` entry and open a new one. All or nothing — a half-written batch
 * would become "the newest" on the site.
 * The plan was computed from batch `basedOn`; if another publication got in first, this one stops
 * (`StalePublicationError`, or the unique batch+type+code index for an exact race) instead of
 * writing prices computed from an old batch over the new ones.
 */
export async function writeBatch(
  payload: Payload,
  plan: Extract<PublicationPlan, { ok: true }>,
  /** The admin who approved it; `null` = no panel account (nothing publishes by itself since P1). */
  user: User | null,
  basedOn: number,
): Promise<{ batch: number; publishedAt: string }> {
  const req = await createLocalReq(user ? { user: { ...user, collection: 'users' } } : {}, payload)
  await initTransaction(req)
  try {
    const newest = await newestBatchNumber(payload, req)
    if (newest !== basedOn) throw new StalePublicationError(basedOn, newest)
    const batch = basedOn + 1
    const publishedAt = new Date().toISOString()

    for (const row of plan.rows) {
      await payload.create({
        collection: 'published-prices',
        data: { batch, ...row, publishedAt, publishedBy: user?.id ?? null },
        overrideAccess: true,
        depth: 0,
        req,
      })
    }
    for (const row of plan.changes) {
      // A bulk update collects per-document errors instead of throwing (Payload 3.91), so check:
      // nothing may fail and at most one entry per item may be open.
      const closed = await payload.update({
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
      if (closed.errors.length > 0 || closed.docs.length > 1) {
        throw new Error(
          `price-history ${row.itemType}:${row.itemCode}: ${closed.docs.length} open entries, ` +
            `${closed.errors.length} errors.`,
        )
      }
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

// --- Cost import (ADR-G002 §4.1) ---

/** Options and level parts as the CSV import matches them. */
export async function loadImportData(
  payload: Payload,
): Promise<{ options: ImportOption[]; levels: ImportLevel[] }> {
  const [options, levels] = await Promise.all([
    payload.find({ collection: 'options', sort: 'code', ...trusted }),
    payload.find({ collection: 'power-levels', sort: 'code', ...trusted }),
  ])
  return {
    options: options.docs.map((o) => ({
      id: o.id,
      code: o.code,
      ean: o.ean,
      cost: o.cost,
      publicLabel: o.publicLabel,
    })),
    levels: levels.docs.map((l) => ({ id: l.id, code: l.code, components: l.components })),
  }
}

/**
 * Write the costs of an import preview, all or nothing. Parts are matched again by position and
 * model, so a level edited since the preview stops the import instead of costing the wrong part.
 * Hooks are told to skip the margin alarm: the import queues one alarm for all rows.
 */
export async function applyCostImport(
  payload: Payload,
  changes: readonly CostChange[],
  user: User,
): Promise<{ options: number; levels: number }> {
  const req = await createLocalReq(
    { user: { ...user, collection: 'users' }, context: { skipMarginAlarm: true } },
    payload,
  )
  const optionCosts = new Map<number, number>()
  const partCosts = new Map<number, Map<number, { model: string; cost: number }>>()
  for (const change of changes) {
    for (const target of change.targets) {
      if (target.kind === 'option') optionCosts.set(target.id, change.newCost)
      else {
        const parts = partCosts.get(target.id) ?? new Map()
        parts.set(target.index, { model: target.model, cost: change.newCost })
        partCosts.set(target.id, parts)
      }
    }
  }

  await initTransaction(req)
  try {
    for (const [id, cost] of optionCosts) {
      await payload.update({
        collection: 'options',
        id,
        data: { cost },
        overrideAccess: true,
        depth: 0,
        req,
      })
    }
    for (const [id, parts] of partCosts) {
      const level = await payload.findByID({
        collection: 'power-levels',
        id,
        overrideAccess: true,
        depth: 0,
        req,
      })
      const components = (level.components ?? []).map((component, index) => {
        const next = parts.get(index)
        if (!next) return component
        if (component.internalModel !== next.model) {
          throw new CatalogError(
            `${level.code}: części zmieniły się od podglądu — odśwież podgląd importu.`,
          )
        }
        return { ...component, cost: next.cost }
      })
      await payload.update({
        collection: 'power-levels',
        id,
        data: { components },
        overrideAccess: true,
        depth: 0,
        req,
      })
    }
    await commitTransaction(req)
    return { options: optionCosts.size, levels: partCosts.size }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}
