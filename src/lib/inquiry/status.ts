import type { InquiryStatus } from './types'

/**
 * When the status last changed — the start of the retention period (ADR-G005). Set on create and
 * on every real change; saving the same status (e.g. another field from the panel) keeps it.
 */
export function nextStatusChangedAt({
  operation,
  status,
  previousStatus,
  previousChangedAt,
  now,
}: {
  operation: 'create' | 'update'
  status: InquiryStatus | null | undefined
  previousStatus?: InquiryStatus | null
  previousChangedAt?: string | null
  now: Date
}): string {
  if (operation === 'create' || !previousChangedAt) return now.toISOString()
  if (status !== undefined && status !== null && status !== previousStatus) {
    return now.toISOString()
  }
  return previousChangedAt
}
