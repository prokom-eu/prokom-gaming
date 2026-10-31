'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { errorFields, log } from '../../lib/logger'
import { decideMatch, numberIn } from '../../lib/mail/match'
import { attachToThread } from '../../lib/mail/store.server'
import { panelActionSession } from '../session'

/**
 * „Nieprzypisane” (ADR-G008 pt 3, P4): attach a message from the mailbox to an inquiry by its
 * number, or reject it. Admin only, checked on the server; logs ids only. The message moves into
 * the thread as the customer's answer (unread +1); the record stays as `attached` until the
 * 90-day retention.
 */

const PATH = '/admin/zapytania'
// TODO(krystian): texts of the results — not on the board.
const DENIED = 'Brak uprawnień — zaloguj się do panelu.'
const FAILED = 'Nie udało się. Spróbuj ponownie.'
const GONE = 'Tej wiadomości już nie ma albo została obsłużona.'

export type UnmatchedResult =
  { ok: true; message: string; number?: string } | { ok: false; message: string }

const id = z.number().int().positive()
const AttachInput = z.object({ id, number: z.string().max(40) })
const RejectInput = z.object({ id })

async function waiting(raw: { id: number }) {
  const session = await panelActionSession('admin')
  if (!session) return { found: false, error: DENIED } as const
  const message = await session.payload.findByID({
    collection: 'mail-intake-unmatched',
    id: raw.id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!message || message.status !== 'new') return { found: false, error: GONE } as const
  return { found: true, ...session, message } as const
}

export async function attachUnmatched(raw: {
  id: number
  number: string
}): Promise<UnmatchedResult> {
  const input = AttachInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const number = numberIn(input.data.number)
  if (!number) return { ok: false, message: 'Wpisz numer zapytania, np. PKG-2026-0047.' }
  try {
    const found = await waiting(input.data)
    if (!found.found) return { ok: false, message: found.error }
    const { payload, message } = found
    const { docs } = await payload.find({
      collection: 'inquiries',
      where: { number: { equals: number } },
      select: { email: true },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const inquiry = docs[0]
    if (!inquiry) return { ok: false, message: `Nie ma zapytania ${number}.` }
    const match = decideMatch(message.from ?? '', {
      byNumber: { id: inquiry.id, email: inquiry.email },
      byReference: null,
    })
    // Marked first: a second click (or tab) finds it handled and cannot attach it twice.
    await payload.update({
      collection: 'mail-intake-unmatched',
      id: message.id,
      data: { status: 'attached', attachedTo: inquiry.id },
      depth: 0,
      overrideAccess: true,
    })
    try {
      await attachToThread(payload, inquiry.id, {
        at: message.receivedAt,
        subject: message.subject ?? '',
        body: message.body,
        messageId: message.messageId ?? null,
        inReplyTo: message.references?.split(' ')[0] || null,
        attachmentsInfo: message.attachmentsInfo ?? null,
        otherSender: message.from ? (match?.otherSender ?? null) : null,
      })
    } catch (error) {
      // Not in the thread: back to „Nieprzypisane”, so it can be attached again.
      await payload.update({
        collection: 'mail-intake-unmatched',
        id: message.id,
        data: { status: 'new', attachedTo: null },
        depth: 0,
        overrideAccess: true,
      })
      throw error
    }
    log.info({ message: message.id, inquiry: inquiry.id }, 'unmatched mail attached')
    revalidatePath(PATH)
    return { ok: true, message: `Przypięto do ${number}.`, number }
  } catch (error) {
    log.error({ message: input.data.id, ...errorFields(error) }, 'unmatched: attach failed')
    return { ok: false, message: FAILED }
  }
}

export async function rejectUnmatched(raw: { id: number }): Promise<UnmatchedResult> {
  const input = RejectInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  try {
    const found = await waiting(input.data)
    if (!found.found) return { ok: false, message: found.error }
    await found.payload.update({
      collection: 'mail-intake-unmatched',
      id: found.message.id,
      data: { status: 'rejected' },
      depth: 0,
      overrideAccess: true,
    })
    log.info({ message: found.message.id }, 'unmatched mail rejected')
    revalidatePath(PATH)
    return { ok: true, message: 'Odrzucono.' }
  } catch (error) {
    log.error({ message: input.data.id, ...errorFields(error) }, 'unmatched: reject failed')
    return { ok: false, message: FAILED }
  }
}
