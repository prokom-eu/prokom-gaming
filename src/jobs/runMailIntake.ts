import 'server-only'

import type { PayloadRequest } from 'payload'

import { getEnv, imapConfig } from '../lib/env'
import { errorFields } from '../lib/logger'
import { inquiryTopic } from '../lib/inquiry/subject'
import { mailErrorEmail } from '../lib/mail/alarm'
import { imapMailbox } from '../lib/mail/imap.server'
import { runIntake } from '../lib/mail/intake'
import { storeIncoming } from '../lib/mail/store.server'
import { notify } from '../lib/notify'
import type { MailIntakeIO } from './mailIntake'

/** One run of the mailbox reader. Logs UIDs and counts only — never addresses or subjects. */
export async function runMailIntake(req: PayloadRequest): Promise<MailIntakeIO['output']> {
  const { payload } = req
  const env = getEnv()
  const config = imapConfig(env)
  if (!config) return { taken: 0, unmatched: 0, skipped: 0, error: false }

  const now = new Date()
  const saved = await payload.findGlobal({
    slug: 'mail-intake-state',
    depth: 0,
    overrideAccess: true,
    req,
  })
  const replied = new Set<number>()
  const result = await runIntake({
    client: imapMailbox(config),
    state: {
      lastUid: saved.lastUid ?? 0,
      uidValidity: saved.uidValidity ?? null,
      errorCount: saved.errorCount ?? 0,
    },
    ownAddress: env.MAIL_FROM_ADDRESS,
    store: async (mail) => {
      const stored = await storeIncoming(payload, mail, now)
      if (stored.inquiryId !== undefined) replied.add(stored.inquiryId)
      return stored.result
    },
    now,
    onFailedParse: (uid, error) =>
      payload.logger.error({ uid, ...errorFields(error) }, 'Mail intake: message not parsed'),
  })

  await payload.updateGlobal({
    slug: 'mail-intake-state',
    data: {
      ...result.state,
      lastRunAt: now.toISOString(),
      ...(result.error ? {} : { lastOkAt: now.toISOString() }),
    },
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (result.error) {
    payload.logger.error(
      { errorCount: result.state.errorCount, ...errorFields(result.failure) },
      'Mail intake failed',
    )
  }
  if (result.restarted) {
    payload.logger.warn(
      { lastUid: result.state.lastUid },
      'Mail intake: new UIDVALIDITY or first run — reading starts from now',
    )
  }
  if (result.alarm) {
    await notify(
      payload,
      {
        kind: 'mail_error',
        push: null,
        email: mailErrorEmail({ settingsUrl: `${env.SITE_URL}/admin/ustawienia` }),
      },
      { req },
    ).catch((error: unknown) =>
      payload.logger.error({ ...errorFields(error) }, 'Mail intake alarm not queued'),
    )
  }
  // One push per inquiry that got an answer in this run (panel spec §14 `inquiry_reply`).
  for (const id of replied) {
    await notifyReply(req, id).catch((error: unknown) =>
      payload.logger.error({ inquiry: id, ...errorFields(error) }, 'Reply push not queued'),
    )
  }

  const { counts } = result
  const taken = counts.thread + counts.unmatched
  if (taken > 0 || counts.failed > 0) payload.logger.info({ ...counts }, 'Mail intake done')
  return {
    taken,
    unmatched: counts.unmatched,
    skipped: counts.skipped,
    error: result.error,
  }
}

async function notifyReply(req: PayloadRequest, id: number): Promise<void> {
  const inquiry = await req.payload.findByID({
    collection: 'inquiries',
    id,
    select: { number: true, type: true, budget: true, voucher: true, build: true },
    populate: { builds: { name: true } },
    depth: 1,
    overrideAccess: true,
    req,
  })
  const number = inquiry.number ?? `#${inquiry.id}`
  const topic = inquiryTopic({
    type: inquiry.type,
    buildName: typeof inquiry.build === 'object' ? inquiry.build?.name : null,
    budget: inquiry.budget,
    voucherAmount: inquiry.voucher?.amount,
  })
  await notify(
    req.payload,
    { kind: 'inquiry_reply', push: { kind: 'inquiry_reply', number, topic }, email: null },
    { req },
  )
}
