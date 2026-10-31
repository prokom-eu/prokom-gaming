import 'server-only'

import type { Payload, Where } from 'payload'

import type { StoreResult } from './intake'
import { decideMatch, numberIn, type ThreadCandidate } from './match'
import type { IncomingMail } from './parse'

/**
 * Saves one incoming mail (ADR-G008 pt 3–5): into the matched inquiry's thread (`in`, unread +1,
 * last activity) or into „Nieprzypisane”. The status never changes — an answer to an offer leaves
 * `offer_sent`, the thread is only lit up as new. A Message-ID already saved is skipped, so a run
 * repeated after an error never doubles a message.
 */

/** A mail without text still gets a line in the thread (the field is required). */
// TODO(krystian): text for an empty incoming message.
const EMPTY_BODY = '(bez treści)'

async function alreadySaved(payload: Payload, messageId: string | null): Promise<boolean> {
  if (!messageId) return false
  const where = { messageId: { equals: messageId } }
  const [inThread, unmatched] = await Promise.all([
    payload.count({ collection: 'inquiry-messages', where, overrideAccess: true }),
    payload.count({ collection: 'mail-intake-unmatched', where, overrideAccess: true }),
  ])
  return inThread.totalDocs + unmatched.totalDocs > 0
}

async function byNumber(payload: Payload, subject: string): Promise<ThreadCandidate | null> {
  const number = numberIn(subject)
  if (!number) return null
  const { docs } = await payload.find({
    collection: 'inquiries',
    where: { number: { equals: number } },
    select: { email: true },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0] ? { id: docs[0].id, email: docs[0].email } : null
}

/** One of our messages (a reply or the confirmation) among In-Reply-To / References. */
async function byReference(payload: Payload, ids: string[]): Promise<ThreadCandidate | null> {
  if (ids.length === 0) return null
  const ours = await payload.find({
    collection: 'inquiry-messages',
    where: { and: [{ messageId: { in: ids } }, { direction: { equals: 'out' } }] },
    select: { inquiry: true, messageId: true },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  // The newest reference first (In-Reply-To), as `references` is ordered.
  const hit = ids
    .map((id) => ours.docs.find((m) => m.messageId === id))
    .find((m) => m !== undefined)
  const where: Where = hit
    ? { id: { equals: typeof hit.inquiry === 'object' ? hit.inquiry.id : hit.inquiry } }
    : { confirmationMessageId: { in: ids } }
  const { docs } = await payload.find({
    collection: 'inquiries',
    where,
    select: { email: true },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0] ? { id: docs[0].id, email: docs[0].email } : null
}

export async function storeIncoming(
  payload: Payload,
  mail: IncomingMail,
  now: Date,
): Promise<StoreResult> {
  if (await alreadySaved(payload, mail.messageId)) return 'duplicate'

  const [number, reference] = await Promise.all([
    byNumber(payload, mail.subject),
    byReference(payload, mail.references),
  ])
  const match = mail.from
    ? decideMatch(mail.from, { byNumber: number, byReference: reference })
    : null
  // A sender's clock can be wrong: never a time in the future in the thread.
  const at = new Date(Math.min(new Date(mail.receivedAt).getTime(), now.getTime())).toISOString()
  const body = mail.body || EMPTY_BODY

  if (!match) {
    await payload.create({
      collection: 'mail-intake-unmatched',
      data: {
        from: mail.from,
        subject: mail.subject,
        receivedAt: at,
        body,
        attachmentsInfo: mail.attachmentsInfo,
        messageId: mail.messageId,
        references: mail.references.join(' ') || null,
        status: 'new',
      },
      depth: 0,
      overrideAccess: true,
    })
    return 'unmatched'
  }

  await attachToThread(payload, match.inquiryId, {
    at,
    subject: mail.subject,
    body,
    messageId: mail.messageId,
    inReplyTo: mail.references[0] ?? null,
    attachmentsInfo: mail.attachmentsInfo,
    otherSender: match.otherSender,
  })
  return 'thread'
}

/**
 * A customer's message in the thread: `in`, plus unread +1 and the last activity on the
 * inquiry. Also used when a message from „Nieprzypisane” is attached by hand.
 */
export async function attachToThread(
  payload: Payload,
  inquiryId: number,
  message: {
    at: string
    subject: string
    body: string
    messageId: string | null
    inReplyTo: string | null
    attachmentsInfo: string | null
    otherSender: string | null
  },
): Promise<void> {
  await payload.create({
    collection: 'inquiry-messages',
    data: { inquiry: inquiryId, direction: 'in', ...message },
    depth: 0,
    overrideAccess: true,
  })
  const inquiry = await payload.findByID({
    collection: 'inquiries',
    id: inquiryId,
    select: { unreadCount: true },
    depth: 0,
    overrideAccess: true,
  })
  await payload.update({
    collection: 'inquiries',
    id: inquiryId,
    data: { unreadCount: (inquiry.unreadCount ?? 0) + 1, lastActivityAt: message.at },
    depth: 0,
    overrideAccess: true,
  })
}
