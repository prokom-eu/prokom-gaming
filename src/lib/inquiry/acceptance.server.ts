import 'server-only'

import { randomUUID } from 'node:crypto'

import type { Payload } from 'payload'

import { originOf } from '../mail/brand'
import { ACCEPTANCE_TOPIC, acceptanceApplies, acceptanceMail } from './acceptance'
import { newMessageId } from './replyMail'
import { inquiryTopic } from './subject'

/**
 * Confirms a customer's „Akceptuję ofertę” that the mailbox reader put into a thread: checks the
 * rules (`acceptanceApplies`), sends the brand confirmation in the same thread and saves it there.
 * Returns what happened, for the log (ids only). Called per stored message by the intake job.
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
): Promise<'sent' | 'skipped'> {
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
  const earlier = await payload.find({
    collection: 'inquiry-messages',
    where: { inquiry: { equals: inquiry.id } },
    select: { messageId: true, subject: true, direction: true },
    sort: 'at',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const number = inquiry.number ?? `#${inquiry.id}`
  const fromCustomer =
    !!input.from && input.from.trim().toLowerCase() === inquiry.email.trim().toLowerCase()
  const alreadyConfirmed = earlier.docs.some(
    (m) => m.direction === 'out' && (m.subject ?? '').includes(ACCEPTANCE_TOPIC),
  )
  if (
    !acceptanceApplies({
      subject: input.subject,
      fromCustomer,
      status: inquiry.status,
      alreadyConfirmed,
    })
  ) {
    return 'skipped'
  }

  const buildName = typeof inquiry.build === 'object' && inquiry.build ? inquiry.build.name : null
  const site = await payload.findGlobal({
    slug: 'site-settings',
    select: { fulfilment: true },
    depth: 0,
    overrideAccess: true,
  })
  const messageId = newMessageId(input.fromAddress, randomUUID())
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
    // The customer's acceptance is the newest message of the thread.
    previousIds: [
      inquiry.confirmationMessageId,
      ...earlier.docs.map((m) => m.messageId),
      ...(earlier.docs.some((m) => m.messageId === input.messageId) ? [] : [input.messageId]),
    ],
  })
  await payload.sendEmail(mail)

  const now = new Date().toISOString()
  await payload.create({
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
  await payload.update({
    collection: 'inquiries',
    id: inquiry.id,
    data: { lastActivityAt: now },
    depth: 0,
    overrideAccess: true,
  })
  return 'sent'
}
