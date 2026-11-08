import type { Access, FieldAccess, PayloadRequest } from 'payload'

import { normalizeEmail } from '../lib/email'
import { isCustomer, isPanelUser } from './panel'

type ReqUser = Pick<PayloadRequest, 'user'>

/**
 * The signed-in customer's e-mail, only when it is verified. Payload refuses to log in an
 * unverified account (`verify: true`), so this is a second lock: an account set up on someone
 * else's address never sees that person's orders (decision 31.10.2026).
 */
export function verifiedCustomerEmail(req: ReqUser): string | null {
  if (!isCustomer(req) || !req.user) return null
  const user = req.user as { email?: unknown; _verified?: unknown }
  if (user._verified !== true) return null
  return typeof user.email === 'string' && user.email ? normalizeEmail(user.email) : null
}

/**
 * Orders, units and tickets: panel staff (any role) see all; a verified customer only the
 * records with their own normalised e-mail (ADR-G005, panel spec §6); everyone else nothing.
 */
export const staffOrOwnRecords: Access = ({ req }) => {
  if (isPanelUser(req)) return true
  const email = verifiedCustomerEmail(req)
  return email ? { email: { equals: email } } : false
}

/** Field read access: panel staff only (internal notes, checklists, links to inquiries). */
export const staffOnlyField: FieldAccess = ({ req }) => isPanelUser(req)

/** Spread into a field the customer must not see or set. */
export const staffField = {
  access: { read: staffOnlyField, create: staffOnlyField, update: staffOnlyField },
} as const
