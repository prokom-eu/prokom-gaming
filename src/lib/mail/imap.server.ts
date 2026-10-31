import 'server-only'

import { ImapFlow, type MailboxLockObject } from 'imapflow'
import MailComposer from 'nodemailer/lib/mail-composer'

import type { ImapConfig } from '../env'
import { errorFields, log } from '../logger'
import type { MailboxClient } from './intake'

/**
 * The Gaming mailbox over IMAP (ADR-G008): reading INBOX for the intake job and saving copies of
 * panel replies in „Sent”. imapflow's own logger is off — its lines carry addresses and subjects.
 */

/** Messages bigger than this are cut: the text comes first, attachments only lose their size. */
const MAX_SOURCE = 5 * 1024 * 1024

function connect(config: ImapConfig): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.port === 993,
    // Any other port must upgrade with STARTTLS or fail: without this imapflow logs in in clear
    // text when the offer is stripped on the way (review P4).
    ...(config.port === 993 ? {} : { doSTARTTLS: true }),
    auth: { user: config.user, pass: config.password },
    logger: false,
    disableAutoIdle: true,
    // A hung server must not hold the job: the next run comes in 2 minutes anyway.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  })
}

/** INBOX opened read-only (EXAMINE): no flag changes, no deletes — the intake's promise. */
export function imapMailbox(config: ImapConfig): MailboxClient {
  const client = connect(config)
  let lock: MailboxLockObject | null = null
  return {
    async open() {
      await client.connect()
      lock = await client.getMailboxLock('INBOX', { readOnly: true })
      const box = client.mailbox
      if (!box) throw new Error('INBOX not opened')
      return { uidValidity: String(box.uidValidity), uidNext: box.uidNext }
    },
    async fetchAfter(afterUid, limit) {
      // `N:*` returns the newest message even when its UID is below N — hence the filter.
      const found = await client.search({ uid: `${afterUid + 1}:*` }, { uid: true })
      const uids = (found || [])
        .filter((uid) => uid > afterUid)
        .sort((a, b) => a - b)
        .slice(0, limit)
      if (uids.length === 0) return []
      const messages = await client.fetchAll(
        uids.join(','),
        { uid: true, source: { maxLength: MAX_SOURCE } },
        { uid: true },
      )
      return messages
        .filter((m): m is typeof m & { source: Buffer } => Boolean(m.source))
        .map((m) => ({ uid: m.uid, source: m.source }))
        .sort((a, b) => a.uid - b.uid)
    },
    async close() {
      lock?.release()
      lock = null
      await client.logout().catch(() => client.close())
    },
  }
}

export type SentCopy = {
  from: { name: string; address: string }
  to: string
  subject: string
  text: string
  html: string
  messageId: string
  inReplyTo?: string
  references?: string[]
  date: Date
}

/** The same message as SMTP sent, as raw RFC 822 — for the copy in „Sent”. */
export async function rawMessage(mail: SentCopy): Promise<Buffer> {
  return new MailComposer({ ...mail, from: mail.from }).compile().build()
}

/**
 * Saves a copy of a panel reply in the mailbox's „Sent” folder (ADR-G008 pt 1), marked as read,
 * so the reply is also visible in ordinary mail. The folder: `IMAP_SENT_FOLDER`, else the one the
 * server marks `\Sent`, else „Sent”.
 */
export async function appendToSent(config: ImapConfig, mail: SentCopy): Promise<void> {
  const client = connect(config)
  try {
    await client.connect()
    let folder = config.sentFolder
    if (!folder) {
      const list = await client.list()
      folder = list.find((box) => box.specialUse === '\\Sent')?.path ?? 'Sent'
    }
    await client.append(folder, await rawMessage(mail), ['\\Seen'], mail.date)
  } finally {
    await client.logout().catch(() => client.close())
  }
}

/** `appendToSent` that never throws: the reply already went out, a missing copy is only logged. */
export async function copyToSent(config: ImapConfig, mail: SentCopy): Promise<void> {
  try {
    await appendToSent(config, mail)
  } catch (error) {
    log.error({ ...errorFields(error) }, 'Reply not copied to the Sent folder')
  }
}
