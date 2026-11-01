'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { isErasedEmail } from '../../lib/clients'
import { errorFields, log } from '../../lib/logger'
import { buildStageMail } from '../../lib/orderMail'
import {
  CHECKLIST_ITEMS,
  isOrderStage,
  nextStage,
  ORDER_STAGES,
  STAGE_MAIL_STAGES,
} from '../../lib/orders'
import { panelActionSession } from '../session'

/**
 * Actions of /admin/zamowienia (panel spec §7). Any panel role (`admin`, `serwis`) — checked on
 * the server (ADR-G006 pt 3). Writes go through the Local API as the signed-in person, so the
 * order hooks record who moved the stage or ticked the checklist. Logs carry ids only.
 */

const PATH = '/admin/zamowienia'
// TODO(krystian): texts of the results — not on the board.
const DENIED = 'Brak uprawnień — zaloguj się do panelu.'
const FAILED = 'Nie udało się zapisać. Spróbuj ponownie.'
const GONE = 'Tego zamówienia już nie ma.'
const MOVED = 'Ktoś w międzyczasie zmienił etap — odśwież tablicę.'

export type MoveResult =
  { ok: true; mail: 'sent' | 'off' | 'none' | 'failed' } | { ok: false; message: string }
export type SaveResult = { ok: true } | { ok: false; message: string }

const id = z.number().int().positive()
const MoveInput = z.object({ orderId: id, from: z.enum(ORDER_STAGES) })
const CheckInput = z.object({
  orderId: id,
  key: z.enum(CHECKLIST_ITEMS.map((c) => c.value) as [string, ...string[]]),
  done: z.boolean(),
})
const NoteInput = z.object({ orderId: id, note: z.string().max(2000) })

/**
 * „Przesuń do: <next>”. `from` is the stage the person saw: if it changed meanwhile, nothing
 * moves. The hook appends `stageHistory`; then — when switched on in Ustawienia and the new stage
 * is one the customer hears about — the stage e-mail goes out. A failed e-mail does not undo the
 * move: the result says so.
 */
export async function moveStage(raw: { orderId: number; from: string }): Promise<MoveResult> {
  const session = await panelActionSession('staff')
  if (!session) return { ok: false, message: DENIED }
  const input = MoveInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const { orderId, from } = input.data
  const to = nextStage(from)
  if (!to) return { ok: false, message: FAILED }
  const { payload, user } = session

  let order
  try {
    const found = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 1,
      populate: { builds: { name: true } },
      overrideAccess: true,
      disableErrors: true,
    })
    if (!found) return { ok: false, message: GONE }
    if (found.stage !== from) return { ok: false, message: MOVED }
    order = await payload.update({
      collection: 'orders',
      id: orderId,
      data: { stage: to },
      depth: 1,
      populate: { builds: { name: true } },
      user,
      overrideAccess: false,
    })
  } catch (error) {
    log.error({ order: orderId, ...errorFields(error) }, 'orders: stage not moved')
    return { ok: false, message: FAILED }
  }
  log.info({ order: orderId, stage: to, user: user.id }, 'orders: stage moved')
  revalidatePath(PATH)

  // An anonymised order (erasure on request) has no address to write to.
  if (
    !isOrderStage(order.stage) ||
    !STAGE_MAIL_STAGES.includes(order.stage) ||
    isErasedEmail(order.email)
  ) {
    return { ok: true, mail: 'none' }
  }
  try {
    const [settings, templates] = await Promise.all([
      payload.findGlobal({ slug: 'mail-settings', depth: 0, overrideAccess: true }),
      payload.find({
        collection: 'reply-templates',
        where: { and: [{ kind: { equals: 'stage' } }, { active: { equals: true } }] },
        sort: 'order',
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
    ])
    if (settings.stageEmail === false) return { ok: true, mail: 'off' }
    const build = typeof order.build === 'object' && order.build ? order.build.name : null
    const mail = buildStageMail({
      to: order.email,
      orderNumber: order.number ?? `#${order.id}`,
      stage: order.stage,
      buildName: build,
      signature: settings.signature ?? null,
      template: templates.docs[0]?.body ?? null,
    })
    await payload.sendEmail(mail)
    log.info({ order: orderId, stage: order.stage }, 'orders: stage e-mail sent')
    return { ok: true, mail: 'sent' }
  } catch (error) {
    log.error({ order: orderId, ...errorFields(error) }, 'orders: stage e-mail not sent')
    return { ok: true, mail: 'failed' }
  }
}

/** One checklist item ticked or unticked; the hook stamps when and who. */
export async function setChecklistItem(raw: {
  orderId: number
  key: string
  done: boolean
}): Promise<SaveResult> {
  const session = await panelActionSession('staff')
  if (!session) return { ok: false, message: DENIED }
  const input = CheckInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const { orderId, key, done } = input.data
  const { payload, user } = session
  try {
    const found = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
      select: { checklist: true },
      overrideAccess: true,
      disableErrors: true,
    })
    if (!found) return { ok: false, message: GONE }
    const current = found.checklist ?? []
    const checklist = CHECKLIST_ITEMS.map(({ value }) => {
      const item = current.find((c) => c.key === value)
      return {
        key: value,
        done: value === key ? done : Boolean(item?.done),
        doneAt: item?.doneAt ?? null,
        doneBy:
          typeof item?.doneBy === 'object' ? (item.doneBy?.id ?? null) : (item?.doneBy ?? null),
      }
    })
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: { checklist },
      depth: 0,
      user,
      overrideAccess: false,
    })
  } catch (error) {
    log.error({ order: orderId, key, ...errorFields(error) }, 'orders: checklist not saved')
    return { ok: false, message: FAILED }
  }
  revalidatePath(PATH)
  return { ok: true }
}

/** „Notatka warsztatu” — the last line on the card. */
export async function saveWorkshopNote(raw: {
  orderId: number
  note: string
}): Promise<SaveResult> {
  const session = await panelActionSession('staff')
  if (!session) return { ok: false, message: DENIED }
  const input = NoteInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const { orderId, note } = input.data
  try {
    await session.payload.update({
      collection: 'orders',
      id: orderId,
      data: { workshopNote: note.trim() || null },
      depth: 0,
      user: session.user,
      overrideAccess: false,
    })
  } catch (error) {
    log.error({ order: orderId, ...errorFields(error) }, 'orders: note not saved')
    return { ok: false, message: FAILED }
  }
  revalidatePath(PATH)
  return { ok: true }
}
