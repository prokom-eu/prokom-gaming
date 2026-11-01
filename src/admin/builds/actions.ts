'use server'

import { revalidatePath } from 'next/cache'
import { createLocalReq, type Payload } from 'payload'
import { z } from 'zod'

import { compatMessage } from '../../lib/compat'
import { errorFields, log } from '../../lib/logger'
import { costContext, evaluate } from '../../lib/pricing/cost'
import { priceFromSnapshot } from '../../lib/pricing/snapshot'
import { ITEM_CODE } from '../../lib/pricing/types'
import { panelActionSession } from '../session'
import { loadBuildsContext } from './load'

export type SaveBuildResult =
  | { ok: true; price: number | null }
  /** The new price on the site needs the confirmation „X zł → Y zł” (panel spec §9). */
  | { ok: false; confirm: { from: number | null; to: number } }
  | { ok: false; messages: string[] }

const code = z.string().regex(ITEM_CODE)
const input = z.object({
  slug: z.string().min(1).max(80),
  config: z.object({ level: code, case: code, cooler: code, ram: code, ssd: code }),
  status: z.enum(['published', 'draft', 'hidden']),
  /** The price the person confirmed; must equal the price computed here. */
  confirmedPrice: z.number().int().nonnegative().nullable(),
})

const NO_ACCESS = 'Brak uprawnień — zaloguj się do panelu.'

/**
 * „Zapisz” of the build editor (panel spec §9, decision P0): the recipe and the status are saved
 * at once — a build is a sum of published item prices, not an item of the queue. A build that
 * will be on the site and changes its price needs the confirmation of exactly that price; an
 * item without a published price blocks saving. Everything is checked again here.
 */
export async function saveBuild(raw: unknown): Promise<SaveBuildResult> {
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, messages: [NO_ACCESS] }
  const parsed = input.safeParse(raw)
  if (!parsed.success) return { ok: false, messages: ['Nieprawidłowe dane z formularza.'] }
  const { payload, user } = session
  const { slug, config, status, confirmedPrice } = parsed.data

  try {
    const ctx = await loadBuildsContext(payload)
    if ('error' in ctx) return { ok: false, messages: [ctx.error] }
    const build = ctx.offer.builds.find((b) => b.slug === slug)
    if (!build) return { ok: false, messages: ['Nie ma takiego zestawu.'] }

    const { catalog } = ctx.offer
    const level = catalog.levels.find((l) => l.code === config.level)
    if (!level) return { ok: false, messages: ['Nie ma takiego poziomu mocy.'] }
    for (const slot of ['case', 'cooler', 'ram', 'ssd'] as const) {
      const option = catalog.options.find((o) => o.code === config[slot] && o.type === slot)
      if (!option) return { ok: false, messages: [`Nie ma takiej opcji: ${config[slot]}.`] }
      if (!option.active) {
        return { ok: false, messages: [`${config[slot]} jest wyłączona w konfiguratorze.`] }
      }
    }
    const price = priceFromSnapshot(config, ctx.snapshot)
    if (price === null) {
      // TODO(krystian): message not on the board.
      return {
        ok: false,
        messages: [
          'Przepis ma pozycję bez opublikowanej ceny — zatwierdź ją najpierw w „Do zatwierdzenia”.',
        ],
      }
    }
    const evaluated = evaluate(config, costContext(catalog, ctx.snapshot))
    if (!evaluated) return { ok: false, messages: ['Nie da się wycenić tego przepisu.'] }
    if (evaluated.errors.length > 0) {
      return { ok: false, messages: evaluated.errors.map((e) => compatMessage(e, level)) }
    }

    const before = priceFromSnapshot(build.config, ctx.snapshot)
    const onSite = status === 'published'
    const priceChanges = build.offerStatus !== 'published' || before !== price
    if (onSite && priceChanges && confirmedPrice !== price) {
      return {
        ok: false,
        confirm: { from: build.offerStatus === 'published' ? before : null, to: price },
      }
    }

    const ids = await idsOf(payload, config)
    const req = await createLocalReq({ user: { ...user, collection: 'users' } }, payload)
    await payload.update({
      collection: 'builds',
      id: build.id,
      data: { ...ids, offerStatus: status },
      overrideAccess: false,
      depth: 0,
      req,
    })
    log.info({ slug, status, from: before, to: price, userId: user.id }, 'build recipe saved')
    revalidatePath('/', 'layout')
    return { ok: true, price }
  } catch (error) {
    log.error({ ...errorFields(error), slug }, 'build save failed')
    return {
      ok: false,
      messages: ['Zapis nie powiódł się — nic nie zmieniono. Szczegóły w logach.'],
    }
  }
}

/** Codes → document ids of the level and the four options. */
async function idsOf(payload: Payload, config: z.infer<typeof input>['config']) {
  const [levels, options] = await Promise.all([
    payload.find({
      collection: 'power-levels',
      where: { code: { equals: config.level } },
      select: { code: true },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'options',
      where: { code: { in: [config.case, config.cooler, config.ram, config.ssd] } },
      select: { code: true },
      limit: 4,
      depth: 0,
      overrideAccess: true,
    }),
  ])
  const option = (c: string) => {
    const doc = options.docs.find((o) => o.code === c)
    if (!doc) throw new Error(`option ${c} vanished`)
    return doc.id
  }
  const level = levels.docs[0]
  if (!level) throw new Error(`level ${config.level} vanished`)
  return {
    level: level.id,
    case: option(config.case),
    cooler: option(config.cooler),
    ram: option(config.ram),
    ssd: option(config.ssd),
  }
}
