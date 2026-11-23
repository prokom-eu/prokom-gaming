import type { Payload } from 'payload'

import { staffOnly } from './panel'

const SLUG = 'payload-locked-documents'

/**
 * Payload adds `payload-locked-documents` itself (during config sanitize, after plugins) with
 * access "any logged-in user" — here also a customer, who could list which documents which
 * employee edits and create or delete locks (audit AB4, G-02). Payload 3.91 has no option for
 * this collection's access, so it is narrowed on the built collection at start.
 */
export function restrictLockedDocuments(payload: Pick<Payload, 'collections'>): boolean {
  const collection = (
    payload.collections as Record<
      string,
      { config: { access: Record<string, unknown> } } | undefined
    >
  )[SLUG]
  if (!collection) return false
  for (const operation of ['create', 'read', 'update', 'delete'] as const) {
    collection.config.access[operation] = staffOnly
  }
  return true
}
