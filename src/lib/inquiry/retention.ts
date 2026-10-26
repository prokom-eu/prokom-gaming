import type { InquiryStatus } from './types'
import { RETAINED_UNTIL_EXPIRY } from './types'

export const INQUIRY_RETENTION_TASK = 'inquiry-retention'

/**
 * `req.context` flag of deletes made by the retention job. The trail's reason comes from it, not
 * from "is a panel user signed in": a panel account may run the job queue itself (review G6).
 */
export const RETENTION_CONTEXT = 'inquiryRetention'

export type RetentionCandidate = {
  id: number
  status: InquiryStatus
  statusChangedAt?: string | null
}

/** `now` minus whole months, clamped to the last day of a shorter month (31.03 − 1 → 28.02). */
export function retentionCutoff(now: Date, months: number): Date {
  const cutoff = new Date(now)
  const day = cutoff.getUTCDate()
  cutoff.setUTCDate(1)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  const lastDay = new Date(
    Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0),
  ).getUTCDate()
  cutoff.setUTCDate(Math.min(day, lastDay))
  return cutoff
}

const expiring = new Set<InquiryStatus>(RETAINED_UNTIL_EXPIRY)

/**
 * Retention rule (ADR-G005, Krystian 27.10.2026): only inquiries finished without an order
 * (`lost`, `closed`), counted from the last status change. `won` becomes an order (tax rules),
 * and `new` / `in_progress` / `offer_sent` stay however old they are — someone owes an answer.
 */
export function isExpired(inquiry: Omit<RetentionCandidate, 'id'>, cutoff: Date): boolean {
  if (!expiring.has(inquiry.status) || !inquiry.statusChangedAt) return false
  return new Date(inquiry.statusChangedAt) < cutoff
}

export async function deleteExpiredInquiries({
  now,
  months,
  findCandidates,
  remove,
}: {
  now: Date
  months: number
  /** Inquiries with an expiring status (coarse database filter; the rule itself is `isExpired`). */
  findCandidates: (statuses: InquiryStatus[], cutoff: Date) => Promise<RetentionCandidate[]>
  /** Deletes by ids, returns how many were deleted. */
  remove: (ids: number[]) => Promise<number>
}): Promise<{ deleted: number }> {
  const cutoff = retentionCutoff(now, months)
  const candidates = await findCandidates([...RETAINED_UNTIL_EXPIRY], cutoff)
  const ids = candidates.filter((doc) => isExpired(doc, cutoff)).map((doc) => doc.id)
  if (ids.length === 0) return { deleted: 0 }
  return { deleted: await remove(ids) }
}
