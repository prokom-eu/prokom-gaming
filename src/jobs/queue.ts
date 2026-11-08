import type { Payload, PayloadRequest } from 'payload'

export const MARGIN_ALARM_TASK = 'margin-alarm'

/**
 * Queue one margin-alarm check (ADR-G002 §4.4), unless one is already waiting: editing several
 * costs in a row must not flood the mailbox. Light on purpose — collection hooks import it, so it
 * must not pull in the cost layer. Returns the job id (new or the waiting one).
 */
export async function queueMarginAlarm(
  payload: Payload,
  reason: string,
  req?: PayloadRequest,
): Promise<number | string> {
  const waiting = await payload.find({
    collection: 'payload-jobs',
    where: {
      and: [
        { taskSlug: { equals: MARGIN_ALARM_TASK } },
        { completedAt: { exists: false } },
        { processing: { equals: false } },
        { hasError: { not_equals: true } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const existing = waiting.docs[0]
  if (existing) return existing.id
  const job = await payload.jobs.queue({
    task: MARGIN_ALARM_TASK,
    input: { reason },
    overrideAccess: true,
    req,
  })
  return job.id
}
