import type { TaskConfig } from 'payload'

import {
  deleteExpiredInquiries,
  INQUIRY_RETENTION_TASK,
  RETENTION_CONTEXT,
} from '../lib/inquiry/retention'

export type InquiryRetentionIO = {
  input: Record<string, never>
  output: { deleted: number }
}

/**
 * Daily retention of inquiries (ADR-G005), run by the in-process job runner (`jobs.autoRun`).
 * Deleting goes through Payload, so each record leaves a trail in `inquiry-deletions`. Logs the
 * count only — no personal data.
 */
export const InquiryRetentionTask: TaskConfig<InquiryRetentionIO> = {
  slug: INQUIRY_RETENTION_TASK,
  label: 'Usuwanie zakończonych zapytań po okresie przechowywania',
  // 03:00:00 server time — UTC in the container unless compose sets TZ (G16); seconds first; `schedule` queues the job, the `autoRun` cron runs it.
  schedule: [{ cron: '0 0 3 * * *', queue: 'default' }],
  outputSchema: [{ name: 'deleted', type: 'number', required: true }],
  retries: 2,
  handler: async ({ req }) => {
    const { getEnv } = await import('../lib/env')
    const { payload } = req
    const result = await deleteExpiredInquiries({
      now: new Date(),
      months: getEnv().INQUIRY_RETENTION_MONTHS,
      findCandidates: async (statuses, cutoff) => {
        const { docs } = await payload.find({
          collection: 'inquiries',
          where: {
            and: [
              { status: { in: statuses } },
              { statusChangedAt: { less_than: cutoff.toISOString() } },
            ],
          },
          select: { status: true, statusChangedAt: true },
          pagination: false,
          depth: 0,
          overrideAccess: true,
          req,
        })
        return docs
      },
      remove: async (ids) => {
        // A bulk delete collects per-document errors instead of throwing (Payload 3.91).
        const { docs, errors } = await payload.delete({
          collection: 'inquiries',
          where: { id: { in: ids } },
          depth: 0,
          overrideAccess: true,
          context: { [RETENTION_CONTEXT]: true },
          req,
        })
        if (errors.length > 0) {
          payload.logger.error({ failed: errors.length }, 'Inquiry retention: some deletes failed')
        }
        return docs.length
      },
    })
    payload.logger.info({ deleted: result.deleted }, 'Inquiry retention done')
    return { output: result }
  },
}
