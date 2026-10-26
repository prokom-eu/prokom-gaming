/**
 * Local seed: `pnpm seed` (runs through `payload run`). Idempotent — safe to run repeatedly:
 * offer documents are matched by `code`/`slug` and updated to the seed values, photos by file
 * name, and the first price batch is written only while no batch exists.
 * Requires an up-to-date schema: run `pnpm payload migrate` first.
 */
import path from 'path'
import {
  commitTransaction,
  createLocalReq,
  getPayload,
  initTransaction,
  killTransaction,
} from 'payload'
import type { CollectionSlug, Payload, RequiredDataFromCollectionSlug } from 'payload'
import { fileURLToPath } from 'url'

import config from '../payload.config'
import { assertSeedAllowed, parseSeedEnv } from './config'
import { fpsSeed, mapFpsResult, mapGame, planFpsResults, type ExistingFpsResult } from './fps'
import {
  firstBatch,
  firstBatchPublishedAt,
  mapBuild,
  mapOption,
  mapPowerLevel,
  mapPricingSettings,
  mapSiteSettings,
  seed,
} from './offer'

assertSeedAllowed(process.env.NODE_ENV)
const { adminEmail, adminPassword } = parseSeedEnv(process.env)

const MEDIA_SOURCE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../seed/prokomgaming/media',
)

/**
 * Every write in the seed bypasses access control: it is a trusted local script. Resetting costs
 * to the seed values must not queue margin alarms (`queueAlarmOnCostChange`).
 */
const asSeed = { overrideAccess: true, depth: 0, context: { skipMarginAlarm: true } } as const

async function findIdBy(
  payload: Payload,
  collection: CollectionSlug,
  field: string,
  value: string,
): Promise<number | undefined> {
  const found = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
    pagination: false,
    ...asSeed,
  })
  return found.docs[0]?.id as number | undefined
}

/** Create the document, or update it to the seed values when one with this key exists. */
async function upsert<S extends 'options' | 'power-levels' | 'builds' | 'games'>(
  payload: Payload,
  collection: S,
  field: 'code' | 'slug',
  data: RequiredDataFromCollectionSlug<S>,
): Promise<number> {
  const value = (data as Record<string, unknown>)[field] as string
  const id = await findIdBy(payload, collection, field, value)
  if (id !== undefined) {
    // Same full document as `create` below (type-checked there); Payload's generic `update`
    // type (DeepPartial of a generic slug) cannot be proven from it, hence the cast.
    await payload.update({ collection, id, data: data as never, ...asSeed })
    return id
  }
  const created = await payload.create({ collection, data, ...asSeed })
  return created.id as number
}

async function seedAdmin(payload: Payload): Promise<number> {
  const existing = await findIdBy(payload, 'users', 'email', adminEmail)
  if (existing !== undefined) {
    payload.logger.info('Seed: local admin already exists, skipped.')
    return existing
  }
  const created = await payload.create({
    collection: 'users',
    data: { email: adminEmail, password: adminPassword },
    ...asSeed,
  })
  payload.logger.info('Seed: local admin created.')
  return created.id
}

/** Photos of cases and coolers (46). Uploaded once; the file name is the key. */
async function seedMedia(payload: Payload): Promise<Map<string, number>> {
  const ids = new Map<string, number>()
  for (const option of seed.options) {
    if (!option.image) continue
    const filename = path.basename(option.image)
    let id = await findIdBy(payload, 'media', 'filename', filename)
    if (id === undefined) {
      const created = await payload.create({
        collection: 'media',
        data: { alt: option.publicLabel },
        filePath: path.join(MEDIA_SOURCE, option.image),
        // A file left on disk by an earlier database (e.g. after migrate:down) keeps its name.
        overwriteExistingFiles: true,
        ...asSeed,
      })
      id = created.id
    }
    ids.set(option.code, id)
  }
  return ids
}

async function seedOffer(payload: Payload): Promise<void> {
  const imageIds = await seedMedia(payload)

  const optionIds = new Map<string, number>()
  for (const option of seed.options) {
    const data = mapOption(option, imageIds.get(option.code) ?? null)
    optionIds.set(option.code, await upsert(payload, 'options', 'code', data))
  }

  const levelIds = new Map<string, number>()
  for (const level of seed.levels) {
    levelIds.set(level.code, await upsert(payload, 'power-levels', 'code', mapPowerLevel(level)))
  }

  const ref = (ids: Map<string, number>, code: string): number => {
    const id = ids.get(code)
    if (id === undefined) throw new Error(`Seed: unknown code ${code} in builds.json.`)
    return id
  }
  const buildIds = new Map<string, number>()
  for (const build of seed.builds) {
    const creature = seed.creatures.find((c) => c.slug === build.creature)
    if (!creature) throw new Error(`Seed: no creature ${build.creature} in creatures.json.`)
    const data = mapBuild(build, creature, {
      level: ref(levelIds, build.level),
      case: ref(optionIds, build.case),
      cooler: ref(optionIds, build.cooler),
      ram: ref(optionIds, build.ram),
      ssd: ref(optionIds, build.ssd),
    })
    buildIds.set(build.slug, await upsert(payload, 'builds', 'slug', data))
  }

  // Second pass: a level points at its lead build, which did not exist in the first one.
  for (const level of seed.levels) {
    await payload.update({
      collection: 'power-levels',
      id: ref(levelIds, level.code),
      data: { leadBuild: ref(buildIds, level.leadBuild) },
      ...asSeed,
    })
  }

  await payload.updateGlobal({
    slug: 'pricing-settings',
    data: mapPricingSettings(seed.pricingSettings),
    ...asSeed,
  })
  await payload.updateGlobal({
    slug: 'site-settings',
    data: mapSiteSettings(seed.siteSettings),
    ...asSeed,
  })

  payload.logger.info(
    `Seed: ${optionIds.size} options (${imageIds.size} photos), ${levelIds.size} power levels, ` +
      `${buildIds.size} builds, settings.`,
  )
}

/**
 * First price publication + its price history, in one transaction: a half-written batch would
 * make the next run skip it as "already published".
 */
async function seedFirstBatch(payload: Payload, adminId: number): Promise<void> {
  const existing = await payload.count({ collection: 'published-prices', overrideAccess: true })
  if (existing.totalDocs > 0) {
    payload.logger.info('Seed: published prices already exist, first batch skipped.')
    return
  }

  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
    const publishedAt = firstBatchPublishedAt()
    const rows = firstBatch()
    for (const row of rows) {
      await payload.create({
        collection: 'published-prices',
        data: { batch: 1, ...row, publishedAt, publishedBy: adminId },
        req,
        ...asSeed,
      })
      await payload.create({
        collection: 'price-history',
        data: {
          batch: 1,
          itemType: row.itemType,
          itemCode: row.itemCode,
          sellPrice: row.sellPrice,
          validFrom: publishedAt,
        },
        req,
        ...asSeed,
      })
    }
    await commitTransaction(req)
    payload.logger.info(`Seed: first price batch published (${rows.length} prices).`)
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

/** 33 games, upserted by `slug` (ADR-G004 §5). */
async function seedGames(payload: Payload): Promise<void> {
  for (const game of fpsSeed.games) await upsert(payload, 'games', 'slug', mapGame(game))
  payload.logger.info(`Seed: ${fpsSeed.games.length} games.`)
}

/**
 * 1 584 FPS results: one read of the existing test numbers, then only new or changed slots are
 * written, in one transaction (a half-imported table would show some builds without numbers).
 * PRO-KOM measurements (`p`) are never read or touched.
 */
async function seedFpsResults(payload: Payload): Promise<void> {
  const all = { pagination: false, ...asSeed } as const
  const builds = new Map(
    (await payload.find({ collection: 'builds', select: { slug: true }, ...all })).docs.map((b) => [
      b.slug,
      b.id,
    ]),
  )
  const games = new Map(
    (await payload.find({ collection: 'games', select: { name: true }, ...all })).docs.map((g) => [
      g.name,
      g.id,
    ]),
  )
  const requireId = (ids: Map<string, number>, key: string) => {
    const id = ids.get(key)
    if (id === undefined) throw new Error(`Seed: unknown ${key} in fps-sources.json.`)
    return id
  }
  const wanted = fpsSeed.results.map((row) =>
    mapFpsResult(row, { build: requireId(builds, row.build), game: requireId(games, row.game) }),
  )
  const existing = await payload.find({
    collection: 'fps-results',
    where: { kind: { not_equals: 'p' } },
    pagination: false,
    ...asSeed,
  })
  const plan = planFpsResults(wanted, existing.docs as ExistingFpsResult[])

  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
    for (const data of plan.create) {
      await payload.create({ collection: 'fps-results', data, req, ...asSeed })
    }
    for (const { id, data } of plan.update) {
      await payload.update({ collection: 'fps-results', id, data, req, ...asSeed })
    }
    await commitTransaction(req)
  } catch (error) {
    await killTransaction(req)
    throw error
  }
  payload.logger.info(
    `Seed: FPS results — ${plan.create.length} created, ${plan.update.length} updated, ` +
      `${wanted.length - plan.create.length - plan.update.length} unchanged.`,
  )
}

const payload = await getPayload({ config })

try {
  const adminId = await seedAdmin(payload)
  await seedOffer(payload)
  await seedFirstBatch(payload, adminId)
  await seedGames(payload)
  await seedFpsResults(payload)
} finally {
  await payload.destroy()
}
