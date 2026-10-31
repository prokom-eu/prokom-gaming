import type { Access, FieldAccess, PayloadRequest } from 'payload'

/** Panel roles (panel spec §15). `serwis` runs the workshop: orders, units, tickets — nothing else. */
export const USER_ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'serwis', label: 'Serwis' },
] as const
export type UserRole = (typeof USER_ROLES)[number]['value']

type ReqUser = Pick<PayloadRequest, 'user'>

/**
 * Signed in to the panel as PRO-KOM staff (`users`), any role. Not just "signed in": customers
 * sign in to their own `customers` collection (ADR-G005) and must never pass these checks.
 */
export function isPanelUser(req: ReqUser): boolean {
  return req.user?.collection === 'users'
}

/**
 * Panel staff with the `admin` role. Costs, margins, inquiries, prices, settings and offer edits
 * are admin-only (panel spec §15). A user without a role (never saved since G14) is not an admin.
 */
export function isAdmin(req: ReqUser): boolean {
  const user = req.user as { collection?: string; role?: unknown } | null | undefined
  return user?.collection === 'users' && user.role === 'admin'
}

/** Signed in to the customer account (`customers`). */
export function isCustomer(req: ReqUser): boolean {
  return req.user?.collection === 'customers'
}

/** Collection or global access: admins only. */
export const adminOnly: Access = ({ req }) => isAdmin(req)

/** Collection access: any panel role (admin or serwis) — the workshop collections from G14. */
export const staffOnly: Access = ({ req }) => isPanelUser(req)

/** Anyone may read — used for offer data the public site shows. */
export const anyone: Access = () => true

/** Nobody through the API or the panel: written only by the seed and price publication (G4). */
export const nobody: Access = () => false

/** Field access: the field exists only for admins (costs, internal models, markups). */
export const adminOnlyField: FieldAccess = ({ req }) => isAdmin(req)

/** Spread into a field: read, create and update limited to admins. */
export const adminField = {
  access: { read: adminOnlyField, create: adminOnlyField, update: adminOnlyField },
} as const
