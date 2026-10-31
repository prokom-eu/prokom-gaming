'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getEnv } from '../../lib/env'
import { errorFields, log } from '../../lib/logger'
import {
  addInquiryNote,
  loadReplyContext,
  sendInquiryReply,
  topicOf,
} from '../../lib/inquiry/thread.server'
import { CONFIG_TYPES, INQUIRY_STATUSES, type InquiryStatus } from '../../lib/inquiry/types'
import { panelActionSession } from '../session'
import { STATUS_CHIP } from './format'

/**
 * Actions of /admin/zapytania (panel spec §4, ADR-G008). Each one checks the admin role on the
 * server (ADR-G006 pt 3), validates its input with Zod and writes through the Local API; logs
 * carry ids only — never a name, e-mail, message or search text (spec §16). A database error
 * returns a message, never an exception to the page.
 */

const PATH = '/admin/zapytania'
const DENIED = 'Brak uprawnień — zaloguj się do panelu.'
// TODO(krystian): texts of the results — not on the board.
const FAILED = 'Nie udało się. Spróbuj ponownie.'
const GONE = 'Tego zapytania już nie ma.'

export type ActionResult =
  | { ok: true; message?: string }
  /** `not_recorded`: the mail went out — the reply box must not let it be sent again. */
  | { ok: false; message: string; code?: 'not_recorded' }

const id = z.number().int().positive()
// Same limit as `inquiry-messages.body`.
const text = z.string().max(20_000)
const ReplyInput = z.object({ inquiryId: id, body: text, templateId: id.nullable() })
const NoteInput = z.object({ inquiryId: id, body: text })
const StatusInput = z.object({ inquiryId: id, status: z.enum(INQUIRY_STATUSES) })
const OrderInput = z.object({ inquiryId: id })

type Found = NonNullable<Awaited<ReturnType<typeof panelActionSession>>> & {
  inquiry: NonNullable<Awaited<ReturnType<typeof findById>>>
}

const findById = (
  session: NonNullable<Awaited<ReturnType<typeof panelActionSession>>>,
  inquiryId: number,
) =>
  session.payload.findByID({
    collection: 'inquiries',
    id: inquiryId,
    depth: 1,
    populate: { builds: { name: true } },
    overrideAccess: true,
    disableErrors: true,
  })

/** Session + inquiry, or the message to show. */
async function open(inquiryId: number): Promise<Found | ActionResult> {
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, message: DENIED }
  try {
    const inquiry = await findById(session, inquiryId)
    return inquiry ? { ...session, inquiry } : { ok: false, message: GONE }
  } catch (error) {
    log.error({ inquiry: inquiryId, ...errorFields(error) }, 'inquiries: lookup failed')
    return { ok: false, message: FAILED }
  }
}
const isResult = (value: Found | ActionResult): value is ActionResult => 'ok' in value

export async function sendReply(raw: {
  inquiryId: number
  body: string
  templateId: number | null
}): Promise<ActionResult> {
  const input = ReplyInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const found = await open(input.data.inquiryId)
  if (isResult(found)) return found
  try {
    const result = await sendInquiryReply(found.payload, {
      inquiry: found.inquiry,
      body: input.data.body,
      templateId: input.data.templateId,
      user: found.user,
      fromAddress: getEnv().MAIL_FROM_ADDRESS,
    })
    revalidatePath(PATH)
    if (result.ok) return { ok: true, message: 'Wysłano.' }
    switch (result.error) {
      case 'empty':
        return { ok: false, message: 'Napisz odpowiedź.' }
      case 'placeholders':
        return {
          ok: false,
          message: `Uzupełnij w treści: ${(result.missing ?? []).map((m) => `{${m}}`).join(', ')}.`,
        }
      case 'smtp':
        return {
          ok: false,
          message: 'Nie udało się wysłać — serwer poczty nie odpowiada. Treść została w polu.',
        }
      case 'not_recorded':
        return {
          ok: false,
          code: 'not_recorded',
          message:
            'Wysłano, ale nie zapisano w wątku — nie wysyłaj ponownie. Sprawdź pocztę Gaming.',
        }
    }
  } catch (error) {
    log.error({ inquiry: found.inquiry.id, ...errorFields(error) }, 'inquiries: reply failed')
    return { ok: false, message: FAILED }
  }
}

export async function addNote(raw: { inquiryId: number; body: string }): Promise<ActionResult> {
  const input = NoteInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const found = await open(input.data.inquiryId)
  if (isResult(found)) return found
  try {
    const result = await addInquiryNote(found.payload, {
      inquiryId: found.inquiry.id,
      body: input.data.body,
      user: found.user,
    })
    if (!result.ok) return { ok: false, message: 'Napisz notatkę.' }
    revalidatePath(PATH)
    return { ok: true, message: 'Dodano notatkę.' }
  } catch (error) {
    log.error({ inquiry: found.inquiry.id, ...errorFields(error) }, 'inquiries: note failed')
    return { ok: false, message: FAILED }
  }
}

export async function setStatus(raw: {
  inquiryId: number
  status: InquiryStatus
}): Promise<ActionResult> {
  const input = StatusInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const { inquiryId, status } = input.data
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, message: DENIED }
  try {
    await session.payload.update({
      collection: 'inquiries',
      id: inquiryId,
      data: { status },
      depth: 0,
      user: session.user,
      overrideAccess: false,
    })
  } catch (error) {
    log.error({ inquiry: inquiryId, ...errorFields(error) }, 'inquiries: status failed')
    return { ok: false, message: FAILED }
  }
  log.info({ inquiry: inquiryId, status }, 'inquiry status changed')
  revalidatePath(PATH)
  return { ok: true, message: `Status: ${STATUS_CHIP[status].label}.` }
}

/**
 * „Zamień w zamówienie” (spec §4): an order with the configuration codes and today's price
 * (decision 31.10.2026), linked to the inquiry; the inquiry becomes `won`. Once per inquiry.
 * A configuration without today's price (a part left the offer, no batch) is refused — the order
 * never takes the old price silently. A unit „od ręki” keeps its reserved price; an inquiry
 * without a computer gets no price (typed in the order later).
 * Count → create → status without a transaction: one person in the panel; at worst a second tab
 * creates a second order, which shows on the board (accepted).
 */
export async function convertToOrder(raw: { inquiryId: number }): Promise<ActionResult> {
  const input = OrderInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const found = await open(input.data.inquiryId)
  if (isResult(found)) return found
  const { payload, user, inquiry } = found
  try {
    const existing = await payload.count({
      collection: 'orders',
      where: { inquiry: { equals: inquiry.id } },
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) {
      return { ok: false, message: 'Zamówienie z tego zapytania już jest.' }
    }
    const { priceToday } = await loadReplyContext(payload, inquiry, user)
    const priced =
      (CONFIG_TYPES as readonly string[]).includes(inquiry.type) || inquiry.type === 'ready'
    if (priced && priceToday === null) {
      return {
        ok: false,
        message:
          'Brak dzisiejszej ceny tej konfiguracji (część wypadła z oferty albo nie ma partii cen) — popraw ofertę w Cenach.',
      }
    }
    const build = typeof inquiry.build === 'object' ? inquiry.build?.id : inquiry.build
    const order = await payload.create({
      collection: 'orders',
      data: {
        stage: 'offer',
        name: inquiry.name,
        email: inquiry.email,
        inquiry: inquiry.id,
        build: build ?? null,
        price: priced ? priceToday : null,
        config: inquiry.config ?? {},
      },
      depth: 0,
      user,
      overrideAccess: false,
    })
    await payload.update({
      collection: 'inquiries',
      id: inquiry.id,
      data: { status: 'won' },
      depth: 0,
      user,
      overrideAccess: false,
    })
    log.info({ inquiry: inquiry.id, order: order.id }, 'inquiry converted to an order')
    revalidatePath(PATH)
    return {
      ok: true,
      message: order.number ? `Utworzono zamówienie ${order.number}.` : 'Utworzono zamówienie.',
    }
  } catch (error) {
    log.error({ inquiry: inquiry.id, ...errorFields(error) }, 'inquiries: convert failed')
    return { ok: false, message: FAILED }
  }
}

export type SearchHit = { number: string; name: string; topic: string; status: InquiryStatus }

/**
 * Search by number, name or build (spec §4): POST through this action, so a name never goes into
 * an address or a log. At most 20 hits; `null` = no access or the search failed.
 */
export async function searchInquiries(query: string): Promise<SearchHit[] | null> {
  if (typeof query !== 'string') return null
  const session = await panelActionSession('admin')
  if (!session) return null
  const q = query.trim().slice(0, 60)
  if (q.length < 2) return []
  try {
    const { docs } = await session.payload.find({
      collection: 'inquiries',
      where: {
        or: [{ number: { like: q } }, { name: { like: q } }, { 'build.name': { like: q } }],
      },
      select: {
        number: true,
        name: true,
        type: true,
        status: true,
        budget: true,
        voucher: true,
        build: true,
      },
      populate: { builds: { name: true } },
      sort: '-createdAt',
      limit: 20,
      depth: 1,
      overrideAccess: true,
    })
    return docs.map((d) => ({
      number: d.number ?? `#${d.id}`,
      name: d.name,
      topic: topicOf(d),
      status: d.status,
    }))
  } catch (error) {
    log.error({ ...errorFields(error) }, 'inquiries: search failed')
    return null
  }
}
