import 'server-only'

import type { PayloadRequest } from 'payload'

import { getEnv, imapConfig } from '../lib/env'
import { errorFields } from '../lib/logger'
import { mailErrorEmail } from '../lib/mail/alarm'
import { imapMailbox } from '../lib/mail/imap.server'
import { runIntake } from '../lib/mail/intake'
import { storeIncoming } from '../lib/mail/store.server'
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
  const result = await runIntake({
    client: imapMailbox(config),
    state: {
      lastUid: saved.lastUid ?? 0,
      uidValidity: saved.uidValidity ?? null,
      errorCount: saved.errorCount ?? 0,
    },
    ownAddress: env.MAIL_FROM_ADDRESS,
    store: (mail) => storeIncoming(payload, mail, now),
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
    if (env.ALERT_EMAIL) {
      await payload
        .sendEmail(
          mailErrorEmail({ to: env.ALERT_EMAIL, settingsUrl: `${env.SITE_URL}/admin/ustawienia` }),
        )
        .catch((error: unknown) =>
          payload.logger.error({ ...errorFields(error) }, 'Mail intake alarm not sent'),
        )
    } else {
      payload.logger.warn('Mail intake: ALERT_EMAIL not set, no alarm sent')
    }
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
