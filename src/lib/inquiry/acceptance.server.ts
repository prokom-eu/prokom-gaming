import 'server-only'

import { randomUUID } from 'node:crypto'

import type { Payload } from 'payload'

import { originOf } from '../mail/brand'
import {
  ACCEPTANCE_ID_PREFIX,
  acceptanceMail,
  acceptanceSkip,
  acceptanceThreadIds,
  isAcceptanceId,
  type SkipReason,
} from './acceptance'
import { newMessageId } from './replyMail'
import { inquiryTopic } from './subject'

/** Where a confirmation failed: before anything went out (`save`) or at SMTP (`send`). */
export class AcceptanceError extends Error {
  constructor(
    readonly stage: 'save' | 'send',
    readonly original: unknown,
  ) {
    super(`Acceptance confirmation failed at ${stage}`)
    this.name = 'AcceptanceError'
  }
}

export type AcceptanceOutcome = { outcome: 'sent' } | { outcome: 'skipped'; reason: SkipReason }

/**
 * Confirms a customer's „Akceptuję ofertę” that the mailbox reader put into a thread: checks the
 * rules (`acceptanceSkip`), saves the confirmation in the thread, then sends it. Saving first means
 * a confirmation that went out is always in the thread (and never goes out twice); a failed send
 * removes the saved line again and throws `AcceptanceError('send')`, so the job can alarm.
 */
export async function confirmAcceptance(
  payload: Payload,
  input: {
    inquiryId: number
    /** The incoming message: its subject, sender and Message-ID. */
    subject: string
    from: string | null
    messageId: string | null
    fromAddress: string
    siteUrl: string | undefined
  },
): Promise<AcceptanceOutcome> {
  const inquiry = await payload.findByID({
    collection: 'inquiries',
    id: input.inquiryId,
    select: {
      number: true,
      email: true,
      status: true,
      type: true,
      budget: true,
      voucher: true,
      build: true,
      confirmationMessageId: true,
    },
    populate: { builds: { name: true } },
    depth: 1,
    overrideAccess: true,
  })
  const thread = await payload.find({
    collection: 'inquiry-messages',
    where: { inquiry: { equals: inquiry.id } },
    select: { messageId: true },
    sort: 'at',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const reason = acceptanceSkip({
    subject: input.subject,
    fromCustomer:
      !!input.from && input.from.trim().toLowerCase() === inquiry.email.trim().toLowerCase(),
    status: inquiry.status,
    alreadyConfirmed: thread.docs.some((m) => isAcceptanceId(m.messageId)),
  })
  if (reason) return { outcome: 'skipped', reason }

  const number = inquiry.number ?? `#${inquiry.id}`
  const buildName = typeof inquiry.build === 'object' && inquiry.build ? inquiry.build.name : null
  const site = await payload.findGlobal({
    slug: 'site-settings',
    select: { fulfilment: true },
    depth: 0,
    overrideAccess: true,
  })
  const messageId = newMessageId(input.fromAddress, `${ACCEPTANCE_ID_PREFIX}${randomUUID()}`)
  const mail = acceptanceMail({
    to: inquiry.email,
    number,
    topic: inquiryTopic({
      type: inquiry.type,
      buildName,
      budget: inquiry.budget,
      voucherAmount: inquiry.voucher?.amount,
    }),
    buildName,
    leadTime: site.fulfilment ?? null,
    siteUrl: originOf(input.siteUrl ?? ''),
    messageId,
    previousIds: acceptanceThreadIds(
      inquiry.confirmationMessageId,
      thread.docs.map((m) => m.messageId),
      input.messageId,
    ),
  })

  const now = new Date().toISOString()
  let savedId: number
  try {
    const saved = await payload.create({
      collection: 'inquiry-messages',
      data: {
        inquiry: inquiry.id,
        direction: 'out',
        at: now,
        subject: mail.subject,
        body: mail.text,
        messageId,
        inReplyTo: mail.inReplyTo ?? null,
      },
      depth: 0,
      overrideAccess: true,
    })
    savedId = saved.id
  } catch (error) {
    throw new AcceptanceError('save', error)
  }

  try {
    // RFC 3834: an automatic answer — the customer's own autoresponder must not reply to it.
    await payload.sendEmail({ ...mail, headers: { 'Auto-Submitted': 'auto-replied' } })
  } catch (error) {
    await payload
      .delete({ collection: 'inquiry-messages', id: savedId, overrideAccess: true })
      .catch(() => undefined)
    throw new AcceptanceError('send', error)
  }

  await payload
    .update({
      collection: 'inquiries',
      id: inquiry.id,
      data: { lastActivityAt: now },
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => undefined)
  return { outcome: 'sent' }
}
