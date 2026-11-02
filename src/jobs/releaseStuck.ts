import type { Payload } from 'payload'

import { log } from '@/lib/logger'

/**
 * Releases jobs left `processing` by a process that died mid-run (container restart, deploy,
 * server reboot). Payload 3.91 never clears that flag on its own, and `defaultBeforeSchedule`
 * refuses to queue a task while one of its jobs is processing — so one restart during a run
 * stopped the mail intake and the SLA alarm for good, without an error (STAN P4).
 *
 * Called once from `onInit` in production, before the job crons start: at that moment no job of
 * this (single) process runs yet, and the previous container is already stopped (compose
 * recreates, not runs side by side). A released job runs again from the start — every task is
 * safe to repeat (the price check marks its own interrupted run, STAN P7).
 */
export async function releaseStuckJobs(payload: Pick<Payload, 'update'>): Promise<number> {
  const result = await payload.update({
    collection: 'payload-jobs',
    where: { processing: { equals: true } },
    data: { processing: false },
    depth: 0,
    overrideAccess: true,
  })
  const released = result.docs.length
  if (released > 0) {
    log.warn({ released }, 'Released jobs stuck in processing after a restart')
  }
  if (result.errors.length > 0) {
    log.error({ failed: result.errors.length }, 'Could not release some stuck jobs')
  }
  return released
}
