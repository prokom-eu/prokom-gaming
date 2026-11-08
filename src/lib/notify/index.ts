import type { Payload, PayloadRequest } from 'payload'

import type { PushData } from './content'
import { CHANNELS, NOTIFY_SEND_TASK, type NotifyKind } from './kinds'

export { NOTIFY_SEND_TASK } from './kinds'

/** One event: its push content data and its e-mail, if any. */
export type NotifyEvent =
  | {
      kind: NotifyKind
      /** Data for the push text (number, topic) — never personal data. */
      push: PushData | null
      /** Ready text for `ALERT_EMAIL` (only kinds with the e-mail channel send it). */
      email: { subject: string; text: string } | null
    }
  /** „Wyślij próbne”: one device of the signed-in user. */
  | { kind: 'test'; push: { kind: 'test' }; email: null; subscription: number }

export type NotifyChannel = 'email' | 'push'

/** The channels an event goes out on (panel spec §14), given what it carries. */
export function channelsOf(event: NotifyEvent): NotifyChannel[] {
  if (event.kind === 'test') return ['push']
  const { email, push } = CHANNELS[event.kind]
  return [
    ...(email && event.email ? (['email'] as const) : []),
    ...(push && event.push ? (['push'] as const) : []),
  ]
}

/**
 * The one way to tell the panel's people about an event (ADR-G010 pt 5, panel spec §14): queues
 * one `notify-send` job per channel — a dead SMTP (retried) never holds back the push, and a
 * retried e-mail never sends the push again. A save hook or the site's form never waits for SMTP
 * or a push service. `runNow` also runs the jobs at once — only from places that already run
 * after the response or in the background (the form's `after()`, other jobs), where seconds
 * matter. Otherwise the job cron takes them within a minute. Light on purpose: hooks and the
 * form import it.
 */
export async function notify(
  payload: Payload,
  event: NotifyEvent,
  { req, runNow = false }: { req?: PayloadRequest; runNow?: boolean } = {},
): Promise<(number | string)[]> {
  const ids: (number | string)[] = []
  for (const channel of channelsOf(event)) {
    const job = await payload.jobs.queue({
      task: NOTIFY_SEND_TASK,
      input: { event, channel },
      overrideAccess: true,
      req,
    })
    ids.push(job.id)
  }
  // Payload 3.91 `runByID` does not check `processing`: the cron could take a job in the moment
  // between queue and run and send it twice. Rare (a minute's cron vs. milliseconds); a doubled
  // push replaces itself (same `tag`), a doubled alarm e-mail is accepted.
  if (runNow) {
    for (const id of ids) await payload.jobs.runByID({ id, overrideAccess: true, req })
  }
  return ids
}
