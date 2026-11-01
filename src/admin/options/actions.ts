'use server'

import { revalidatePath } from 'next/cache'
import { createLocalReq, type Payload } from 'payload'
import { z } from 'zod'

import { errorFields, log } from '../../lib/logger'
import { toCostOption, type PricingSettingsInput } from '../../lib/pricing/catalog'
import { partKey } from '../../lib/pricing/partKey'
import { shopOf, DEFAULT_SHOPS } from '../../lib/pricing/sources'
import { loadBatch } from '../../lib/pricing/store'
import type { User } from '../../payload-types'
import { panelActionSession } from '../session'
import { optionPreview, type OptionPreview } from './preview'

const NO_ACCESS = 'Brak uprawnień — zaloguj się do panelu.'

export type ActionResult = { ok: true } | { ok: false; messages: string[] }

/** The public message of a Payload error (hooks of G4: „Opcja jest w zestawie: …”), else ours. */
function messageOf(error: unknown, fallback: string): string {
  const e = error as {
    data?: { errors?: { message?: string }[] }
    message?: string
    isPublic?: boolean
  }
  const fromField = e?.data?.errors?.[0]?.message
  if (fromField) return fromField
  if (e?.isPublic && e.message) return e.message
  return fallback
}

async function asUser(payload: Payload, user: User) {
  return createLocalReq({ user: { ...user, collection: 'users' } }, payload)
}

// --- Switch „W konfiguratorze” ---

const activeInput = z.object({ id: z.number().int().positive(), active: z.boolean() })

/** „W konfiguratorze” (`active`): switching off an option used in a build is refused (G4 hook). */
export async function setOptionActive(raw: unknown): Promise<ActionResult> {
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, messages: [NO_ACCESS] }
  const parsed = activeInput.safeParse(raw)
  if (!parsed.success) return { ok: false, messages: ['Nieprawidłowe dane.'] }
  const { payload, user } = session
  try {
    await payload.update({
      collection: 'options',
      id: parsed.data.id,
      data: { active: parsed.data.active },
      overrideAccess: false,
      depth: 0,
      req: await asUser(payload, user),
    })
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (error) {
    log.warn({ ...errorFields(error), id: parsed.data.id }, 'option switch refused')
    return {
      ok: false,
      messages: [messageOf(error, 'Nie udało się zmienić — szczegóły w logach.')],
    }
  }
}

// --- Delete ---

const idInput = z.object({ id: z.number().int().positive() })

/** Delete an unused option; an option in a build is refused with its builds (G4 hook). */
export async function deleteOption(raw: unknown): Promise<ActionResult> {
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, messages: [NO_ACCESS] }
  const parsed = idInput.safeParse(raw)
  if (!parsed.success) return { ok: false, messages: ['Nieprawidłowe dane.'] }
  const { payload, user } = session
  try {
    const req = await asUser(payload, user)
    const option = await payload.findByID({
      collection: 'options',
      id: parsed.data.id,
      select: { code: true },
      depth: 0,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'options',
      id: parsed.data.id,
      overrideAccess: false,
      depth: 0,
      req,
    })
    // Its offer links would point at nothing (price-sources keep codes, not relations).
    await payload.delete({
      collection: 'price-sources',
      where: { itemType: { equals: 'option' }, itemCode: { equals: option.code } },
      overrideAccess: false,
      req,
    })
    log.info({ id: parsed.data.id, userId: user.id }, 'option deleted')
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (error) {
    log.warn({ ...errorFields(error), id: parsed.data.id }, 'option delete refused')
    return { ok: false, messages: [messageOf(error, 'Nie udało się usunąć — szczegóły w logach.')] }
  }
}

// --- New option ---

// Costs typed like in a shop: „410”, „199,99”, „1 299”.
const money = z.preprocess(
  (v) => (typeof v === 'string' ? Number(v.replace(/\s/g, '').replace(',', '.')) : v),
  z.number().finite().nonnegative().max(100_000),
)
const mm = z.coerce.number().int().min(1).max(2000)
const klass = z.coerce.number().int().min(1).max(3)
const color = z.enum(['czarny', 'szary', 'biały'])
const text = (max: number) => z.string().trim().min(1).max(max)

const optionInput = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('case'),
    publicLabel: text(120),
    internalModel: text(200),
    cost: money,
    gpuMaxMm: mm,
    coolerMaxMm: mm,
    aio360: z.enum(['none', 'front', 'top_only', 'side', 'yes']),
    class: klass,
    color,
  }),
  z.object({
    type: z.literal('cooler'),
    publicLabel: text(120),
    internalModel: text(200),
    cost: money,
    kind: z.enum(['air', 'aio360']),
    heightMm: mm.optional(),
    radiatorThicknessMm: mm.optional(),
    class: klass,
    color,
  }),
  z.object({
    type: z.literal('ram'),
    publicLabel: text(120),
    internalModel: text(200),
    cost: money,
    ramType: z.enum(['DDR4', 'DDR5']),
    capacityGb: z.coerce.number().int().min(1).max(1024),
  }),
  z.object({
    type: z.literal('ssd'),
    publicLabel: text(120),
    internalModel: text(200),
    cost: money,
    capacityGb: z.coerce.number().int().min(1).max(16_384),
  }),
])
type OptionInput = z.infer<typeof optionInput>

/** Entries of a form as an object; empty fields are left out (optional numbers). */
function fieldsOf(form: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string' && value.trim() !== '') out[key] = value
  }
  return out
}

function parseOption(
  raw: Record<string, string>,
): { ok: true; data: OptionInput } | { ok: false; messages: string[] } {
  const parsed = optionInput.safeParse(raw)
  if (!parsed.success) {
    // TODO(krystian): field messages not on the board.
    return { ok: false, messages: ['Uzupełnij wszystkie pola opcji (liczby bez jednostek).'] }
  }
  const data = parsed.data
  if (data.type === 'cooler') {
    if (data.kind === 'air' && !data.heightMm) {
      return { ok: false, messages: ['Podaj wysokość chłodzenia powietrznego (mm).'] }
    }
    if (data.kind === 'aio360' && !data.radiatorThicknessMm) {
      return { ok: false, messages: ['Podaj grubość chłodnicy AIO (mm).'] }
    }
  }
  return { ok: true, data }
}

/** The input as the cost layer's option (the same mapping as the catalog). */
function costOptionOf(data: OptionInput, code: string) {
  return toCostOption({
    ...data,
    code,
    active: false,
    heightMm: data.type === 'cooler' ? (data.heightMm ?? null) : null,
    radiatorThicknessMm: data.type === 'cooler' ? (data.radiatorThicknessMm ?? null) : null,
  } as Parameters<typeof toCostOption>[0])
}

async function pricingContext(payload: Payload) {
  const [settings, options, batch] = await Promise.all([
    payload.findGlobal({ slug: 'pricing-settings', depth: 0, overrideAccess: true }),
    payload.find({ collection: 'options', depth: 0, pagination: false, overrideAccess: true }),
    loadBatch(payload),
  ])
  const others = options.docs.flatMap((doc) => {
    try {
      return [{ code: doc.code, label: doc.publicLabel, option: toCostOption(doc) }]
    } catch {
      return []
    }
  })
  return { settings: settings as PricingSettingsInput, others, batch }
}

export type PreviewResult = { ok: true; preview: OptionPreview } | { ok: false; messages: string[] }

/** Live „Cena na stronie” of the „Dodaj …” panel. Nothing is written. */
export async function previewOption(raw: unknown): Promise<PreviewResult> {
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, messages: [NO_ACCESS] }
  const parsed = parseOption((raw ?? {}) as Record<string, string>)
  if (!parsed.ok) return parsed
  try {
    const { settings, others, batch } = await pricingContext(session.payload)
    if (!batch) return { ok: false, messages: ['Brak opublikowanych cen — uruchom seed.'] }
    return {
      ok: true,
      preview: optionPreview(costOptionOf(parsed.data, 'NOWA'), settings, others, batch.snapshot),
    }
  } catch (error) {
    log.error({ ...errorFields(error) }, 'option preview failed')
    return { ok: false, messages: ['Nie udało się policzyć ceny — szczegóły w logach.'] }
  }
}

/** „KRUX-EXO-RGB” — an option code from its name (ITEM_CODE), unique among options. */
async function freeCode(payload: Payload, label: string): Promise<string> {
  const base =
    partKey('x', label)
      .slice(2)
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .slice(0, 24)
      .replace(/-+$/, '') || 'OPCJA'
  for (let n = 1; n < 100; n++) {
    const code = n === 1 ? base : `${base}-${n}`
    const taken = await payload.count({
      collection: 'options',
      where: { code: { equals: code } },
      overrideAccess: true,
    })
    if (taken.totalDocs === 0) return code
  }
  throw new Error('no free option code')
}

const IMAGE_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/avif']
// Under the 1 MB body limit of Server Actions (Next default, kept for the whole app).
const MAX_IMAGE = 900 * 1024

export type AddResult = { ok: true; code: string } | { ok: false; messages: string[] }

/**
 * „Dodaj do zatwierdzenia” (panel spec §10): the option is created switched off; it waits in
 * „Do zatwierdzenia” as a new price (the queue covers inactive options) and goes to the
 * configurator only when switched on after publication. Offer links (2–4, allowed shops only)
 * go to `price-sources`; the photo (cases and coolers) to `media`.
 */
export async function addOption(form: FormData): Promise<AddResult> {
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, messages: [NO_ACCESS] }
  const { payload, user } = session
  const parsed = parseOption(fieldsOf(form))
  if (!parsed.ok) return parsed
  const data = parsed.data

  const links = String(form.get('links') ?? '')
    .split(/\s+/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (links.length > 4) return { ok: false, messages: ['Najwyżej 4 linki do ofert.'] }
  const bad = links.find((l) => !shopOf(l))
  if (bad) {
    return {
      ok: false,
      messages: [
        `Link spoza dozwolonych sklepów (${DEFAULT_SHOPS.join(', ')}): ${bad.slice(0, 80)}`,
      ],
    }
  }

  const file = form.get('photo')
  const photo = file instanceof File && file.size > 0 ? file : null
  if (photo && (data.type === 'ram' || data.type === 'ssd')) {
    return { ok: false, messages: ['RAM i dyski są na stronie bez zdjęcia.'] }
  }
  if (photo && (!IMAGE_TYPES.includes(photo.type) || photo.size > MAX_IMAGE)) {
    return { ok: false, messages: ['Zdjęcie: WebP, PNG, JPEG albo AVIF, najwyżej 900 KB.'] }
  }

  try {
    const req = await asUser(payload, user)
    const code = await freeCode(payload, data.publicLabel)
    const image = photo
      ? await payload.create({
          collection: 'media',
          data: { alt: data.publicLabel },
          file: {
            data: Buffer.from(await photo.arrayBuffer()),
            mimetype: photo.type,
            name: photo.name || `${code.toLowerCase()}.webp`,
            size: photo.size,
          },
          overrideAccess: false,
          req,
        })
      : null
    await payload.create({
      collection: 'options',
      data: {
        ...data,
        code,
        active: false,
        costSource: 'market',
        image: image?.id ?? null,
      },
      overrideAccess: false,
      depth: 0,
      req,
    })
    for (const url of links) {
      await payload.create({
        collection: 'price-sources',
        data: { itemType: 'option', itemCode: code, url, active: true, proposedByClaude: false },
        overrideAccess: false,
        depth: 0,
        req,
      })
    }
    log.info({ code, type: data.type, links: links.length, userId: user.id }, 'option added')
    revalidatePath('/admin', 'layout')
    return { ok: true, code }
  } catch (error) {
    log.error({ ...errorFields(error) }, 'option add failed')
    return { ok: false, messages: [messageOf(error, 'Nie udało się dodać — szczegóły w logach.')] }
  }
}
