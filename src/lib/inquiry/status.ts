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

/**
 * Status after a reply from the panel (ADR-G008 pt 5): the first reply moves `new` to
 * `in_progress`; a template of kind `offer` marks `offer_sent`. A finished inquiry (`won`, `lost`,
 * `closed`) keeps its status — writing to a customer after the order does not reopen it.
 */
export function statusAfterReply(
  current: InquiryStatus,
  templateKind: 'reply' | 'offer' | 'stage' | null,
): InquiryStatus {
  if (current !== 'new' && current !== 'in_progress' && current !== 'offer_sent') return current
  if (templateKind === 'offer') return 'offer_sent'
  return current === 'new' ? 'in_progress' : current
}
