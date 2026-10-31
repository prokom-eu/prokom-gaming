'use server'

import { revalidatePath } from 'next/cache'

import { getEnv } from '../../lib/env'
import { errorFields, log } from '../../lib/logger'
import {
  addInquiryNote,
  loadReplyContext,
  sendInquiryReply,
  topicOf,
} from '../../lib/inquiry/thread.server'
import { INQUIRY_STATUSES, type InquiryStatus } from '../../lib/inquiry/types'
import { panelActionSession } from '../session'
import { STATUS_CHIP } from './format'

/**
 * Actions of /admin/zapytania (panel spec §4, ADR-G008). Each one checks the admin role on the
 * server (ADR-G006 pt 3) and writes through the Local API; logs carry ids only — never a name,
 * e-mail, message or search text (spec §16).
 */

const PATH = '/admin/zapytania'
const DENIED = 'Brak uprawnień — zaloguj się do panelu.'
// TODO(krystian): texts of the results — not on the board.
const FAILED = 'Nie udało się. Spróbuj ponownie.'

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string }

async function findInquiry(id: number) {
  const session = await panelActionSession('admin')
  if (!session) return null
  const inquiry = await session.payload.findByID({
    collection: 'inquiries',
    id,
    depth: 1,
    populate: { builds: { name: true } },
    overrideAccess: true,
    disableErrors: true,
  })
  return inquiry ? { ...session, inquiry } : { ...session, inquiry: null }
}

export async function sendReply(input: {
  inquiryId: number
  body: string
  templateId: number | null
}): Promise<ActionResult> {
  const found = await findInquiry(input.inquiryId)
  if (!found) return { ok: false, message: DENIED }
  if (!found.inquiry) return { ok: false, message: 'Tego zapytania już nie ma.' }
  try {
    const result = await sendInquiryReply(found.payload, {
      inquiry: found.inquiry,
      body: input.body,
      templateId: input.templateId,
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
          message:
            'Wysłano, ale nie zapisano w wątku — nie wysyłaj ponownie. Sprawdź pocztę Gaming.',
        }
    }
  } catch (error) {
    log.error({ inquiry: input.inquiryId, ...errorFields(error) }, 'inquiries: reply failed')
    return { ok: false, message: FAILED }
  }
}

export async function addNote(input: { inquiryId: number; body: string }): Promise<ActionResult> {
  const found = await findInquiry(input.inquiryId)
  if (!found) return { ok: false, message: DENIED }
  if (!found.inquiry) return { ok: false, message: 'Tego zapytania już nie ma.' }
  try {
    const result = await addInquiryNote(found.payload, {
      inquiryId: found.inquiry.id,
      body: input.body,
      user: found.user,
    })
    if (!result.ok) return { ok: false, message: 'Napisz notatkę.' }
    revalidatePath(PATH)
    return { ok: true, message: 'Dodano notatkę.' }
  } catch (error) {
    log.error({ inquiry: input.inquiryId, ...errorFields(error) }, 'inquiries: note failed')
    return { ok: false, message: FAILED }
  }
}

export async function setStatus(input: {
  inquiryId: number
  status: InquiryStatus
}): Promise<ActionResult> {
  if (!(INQUIRY_STATUSES as readonly string[]).includes(input.status)) {
    return { ok: false, message: FAILED }
  }
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, message: DENIED }
  try {
    await session.payload.update({
      collection: 'inquiries',
      id: input.inquiryId,
      data: { status: input.status },
      depth: 0,
      user: session.user,
      overrideAccess: false,
    })
  } catch (error) {
    log.error({ inquiry: input.inquiryId, ...errorFields(error) }, 'inquiries: status failed')
    return { ok: false, message: FAILED }
  }
  log.info({ inquiry: input.inquiryId, status: input.status }, 'inquiry status changed')
  revalidatePath(PATH)
  return { ok: true, message: `Status: ${STATUS_CHIP[input.status].label}.` }
}

/**
 * „Zamień w zamówienie” (spec §4): an order with the configuration codes and today's price
 * (decision 31.10.2026), linked to the inquiry; the inquiry becomes `won`. Once per inquiry.
 */
export async function convertToOrder(input: { inquiryId: number }): Promise<ActionResult> {
  const found = await findInquiry(input.inquiryId)
  if (!found) return { ok: false, message: DENIED }
  const { payload, user, inquiry } = found
  if (!inquiry) return { ok: false, message: 'Tego zapytania już nie ma.' }
  try {
    const existing = await payload.count({
      collection: 'orders',
      where: { inquiry: { equals: inquiry.id } },
      overrideAccess: true,
    })
    if (existing.totalDocs > 0)
      return { ok: false, message: 'Zamówienie z tego zapytania już jest.' }
    const { priceToday } = await loadReplyContext(payload, inquiry, user)
    const build = typeof inquiry.build === 'object' ? inquiry.build?.id : inquiry.build
    const order = await payload.create({
      collection: 'orders',
      data: {
        stage: 'offer',
        name: inquiry.name,
        email: inquiry.email,
        inquiry: inquiry.id,
        build: build ?? null,
        price: priceToday ?? inquiry.priceAtInquiry ?? null,
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
    return { ok: true, message: `Utworzono zamówienie ${order.number ?? ''}.`.replace(' .', '.') }
  } catch (error) {
    log.error({ inquiry: inquiry.id, ...errorFields(error) }, 'inquiries: convert failed')
    return { ok: false, message: FAILED }
  }
}

export type SearchHit = { number: string; name: string; topic: string; status: InquiryStatus }

/**
 * Search by number, name or build (spec §4): POST through this action, so a name never goes into
 * an address or a log. At most 20 hits.
 */
export async function searchInquiries(query: string): Promise<SearchHit[] | null> {
  const session = await panelActionSession('admin')
  if (!session) return null
  const q = query.trim().slice(0, 60)
  if (q.length < 2) return []
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
}
