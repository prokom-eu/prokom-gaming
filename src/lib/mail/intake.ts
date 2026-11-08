import { parseMail, skipReason, type IncomingMail } from './parse'

/**
 * One run of reading the Gaming mailbox (ADR-G008 pt 2), without Payload or a network: the
 * mailbox and the storage come in as functions, so the rules are tested on a fake mailbox.
 * - INBOX is opened read-only (EXAMINE): flags never change, nothing is deleted.
 * - Progress is the last UID per UIDVALIDITY. The first run and a changed UIDVALIDITY start from
 *   „now” — an old mailbox is never imported (a missed mail is still in the mailbox).
 * - A failed store stops the run before the UID moves past it: the next run tries again; the
 *   storage skips a Message-ID it already has, so nothing doubles.
 */

/** Messages taken per run; the rest waits two minutes. */
export const BATCH = 50
/** Errors in a row before the alarm (panel spec §14 `mail_error`): sent once, at exactly 3. */
export const ERROR_ALARM_AT = 3

export interface MailboxClient {
  /** Opens INBOX read-only. */
  open(): Promise<{ uidValidity: string; uidNext: number }>
  /** Raw messages with UID > `afterUid`, ascending, at most `limit`. */
  fetchAfter(afterUid: number, limit: number): Promise<{ uid: number; source: Buffer }[]>
  /** Always called, also after an error. */
  close(): Promise<void>
}

export type IntakeState = { lastUid: number; uidValidity: string | null; errorCount: number }
export type StoreResult = 'thread' | 'unmatched' | 'duplicate'

export type IntakeResult = {
  state: IntakeState
  counts: Record<StoreResult | 'skipped' | 'failed', number>
  /** First run or a new UIDVALIDITY: started from the current end of the mailbox. */
  restarted: boolean
  error: boolean
  /** The error of a failed run, for the log (connection or storage — never message content). */
  failure: unknown
  /** Send the `mail_error` alarm now. */
  alarm: boolean
}

/** What the panel keeps of a message that could not be parsed (its UID, nothing else). */
function unreadable(uid: number, now: Date): IncomingMail {
  return {
    from: null,
    subject: '',
    messageId: null,
    references: [],
    receivedAt: now.toISOString(),
    // TODO(krystian): text of an unreadable message in „Nieprzypisane”.
    body: `Nie udało się odczytać tej wiadomości. Przeczytaj ją w poczcie (UID ${uid}).`,
    attachmentsInfo: null,
    headers: {},
  }
}

export async function runIntake({
  client,
  state,
  ownAddress,
  store,
  now,
  parse = parseMail,
  onFailedParse,
}: {
  client: MailboxClient
  state: IntakeState
  ownAddress: string
  store: (mail: IncomingMail) => Promise<StoreResult>
  now: Date
  parse?: (source: Buffer) => Promise<IncomingMail>
  /** Logging hook: UID and the error only — never the message. */
  onFailedParse?: (uid: number, error: unknown) => void
}): Promise<IntakeResult> {
  const counts: IntakeResult['counts'] = {
    thread: 0,
    unmatched: 0,
    duplicate: 0,
    skipped: 0,
    failed: 0,
  }
  let { lastUid, uidValidity } = state
  let restarted = false
  let failure: unknown = null

  try {
    const box = await client.open()
    if (uidValidity !== box.uidValidity) {
      uidValidity = box.uidValidity
      lastUid = Math.max(0, box.uidNext - 1)
      restarted = true
    } else {
      for (const { uid, source } of await client.fetchAfter(lastUid, BATCH)) {
        let mail: IncomingMail
        let readable = true
        try {
          mail = await parse(source)
        } catch (parseError) {
          onFailedParse?.(uid, parseError)
          counts.failed += 1
          readable = false
          mail = unreadable(uid, now)
        }
        // An unreadable message is always kept: we cannot tell whose it is.
        if (readable && skipReason(mail, ownAddress)) {
          counts.skipped += 1
          lastUid = uid
          continue
        }
        counts[await store(mail)] += 1
        lastUid = uid
      }
    }
  } catch (caught) {
    failure = caught ?? new Error('mail intake failed')
  } finally {
    await client.close().catch(() => {})
  }

  const error = failure !== null
  const errorCount = error ? state.errorCount + 1 : 0
  return {
    state: { lastUid, uidValidity, errorCount },
    counts,
    restarted,
    error,
    failure,
    alarm: errorCount === ERROR_ALARM_AT,
  }
}
