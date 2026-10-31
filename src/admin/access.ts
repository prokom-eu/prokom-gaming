import type { PayloadRequest } from 'payload'

import { isAdmin, isPanelUser } from '../access/panel'

/**
 * Who may open a panel view or run a panel action (panel spec §15, ADR-G006 §3):
 * - `admin`: inquiries, prices, costs, margins, settings,
 * - `staff`: any panel role — the workshop (`admin` and `serwis`).
 */
export type PanelNeed = 'admin' | 'staff'

export type PanelAccess = { ok: true } | { ok: false; reason: 'anon' | 'role' }

/**
 * The one access check of every custom view and action. Custom Payload views are public by
 * definition, so each view calls this before it loads anything. `anon` = not signed in to the
 * panel (a signed-in customer counts as anonymous here), `role` = signed in without the role.
 */
export function panelAccess(req: Pick<PayloadRequest, 'user'>, need: PanelNeed): PanelAccess {
  if (!isPanelUser(req)) return { ok: false, reason: 'anon' }
  if (need === 'admin' && !isAdmin(req)) return { ok: false, reason: 'role' }
  return { ok: true }
}
