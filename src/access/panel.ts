import type { Access, FieldAccess, PayloadRequest } from 'payload'

/**
 * Signed in to the panel as PRO-KOM staff (`users`). Not just "signed in": customers get their own
 * auth collection in G14 (ADR-G005) and must never see costs or internal models (ADR-G002 §8.7).
 */
export function isPanelUser(req: Pick<PayloadRequest, 'user'>): boolean {
  return req.user?.collection === 'users'
}

/** Collection or global access: panel staff only. */
export const panelOnly: Access = ({ req }) => isPanelUser(req)

/** Anyone may read — used for offer data the public site shows. */
export const anyone: Access = () => true

/** Nobody through the API or the panel: written only by the seed and price publication (G4). */
export const nobody: Access = () => false

/** Field access: the field exists only in the panel (costs, internal models, markups). */
export const panelOnlyField: FieldAccess = ({ req }) => isPanelUser(req)

/** Spread into a field: read, create and update limited to the panel. */
export const panelField = {
  access: { read: panelOnlyField, create: panelOnlyField, update: panelOnlyField },
} as const
