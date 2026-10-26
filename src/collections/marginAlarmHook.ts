import type { CollectionAfterChangeHook } from 'payload'

import { queueMarginAlarm } from '../jobs/queue'
import { errorFields, log } from '../lib/logger'

/**
 * A cost edited in the panel queues the margin-alarm check (ADR-G002 §4.4); the job runs within a
 * minute. Skipped on create (a new item has no published price yet — it shows as "new" in the
 * queue) and when the caller handles the alarm itself (`context.skipMarginAlarm`: CSV import,
 * seed). A failure to queue is logged, never blocks saving the cost.
 */
export function queueAlarmOnCostChange<T extends { code: string }>(
  costsOf: (doc: T) => string,
): CollectionAfterChangeHook<T & { id: number }> {
  return async ({ doc, previousDoc, operation, req, context }) => {
    if (operation !== 'update' || context.skipMarginAlarm) return doc
    if (costsOf(doc) === costsOf(previousDoc)) return doc
    try {
      await queueMarginAlarm(req.payload, `cost changed: ${doc.code}`, req)
    } catch (error) {
      log.error({ ...errorFields(error), code: doc.code }, 'margin alarm not queued')
    }
    return doc
  }
}
