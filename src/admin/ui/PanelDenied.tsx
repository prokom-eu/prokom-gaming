import type { PayloadRequest } from 'payload'

import type { NavKey } from '../shell/navModel'
import { PanelShell } from './PanelShell'

/**
 * What a custom view shows when `panelAccess` says no (panel spec §15, ADR-G006 §3). Nothing of
 * the screen is loaded before this.
 * - Not signed in: a link to the panel login that comes back here. Not `redirect()`: inside
 *   Payload's admin page it only reaches the RSC stream and leaves a blank page (G4).
 * - Signed in without the role (`serwis` on an admin screen): "403" inside the panel frame, so
 *   the workshop navigation still works. The HTTP status stays 200 — a server component cannot
 *   set it; the screen text is the answer.
 */
export function PanelDenied({
  req,
  reason,
  title,
  path,
  active,
}: {
  req: PayloadRequest
  reason: 'anon' | 'role'
  title: string
  /** Path of the screen under the admin route, for the way back after logging in. */
  path: string
  active?: NavKey
}) {
  const admin = req.payload.config.routes.admin
  if (reason === 'anon') {
    const login = `${admin}/login?redirect=${encodeURIComponent(`${admin}${path}`)}`
    return (
      <div className="pn" data-panel>
        <main className="pn-gate">
          <div className="pn-card">
            <h1>{title}</h1>
            <p>Ten ekran jest tylko dla pracowników PRO-KOM.</p>
            <p>
              <a className="pn-btn pn-btn--gold" href={login}>
                Zaloguj się do panelu
              </a>
            </p>
          </div>
        </main>
      </div>
    )
  }
  return (
    <PanelShell req={req} title={title} active={active}>
      <div className="pn-gate">
        <div className="pn-card" data-access-denied>
          <h1>Brak dostępu (403)</h1>
          <p>Ten ekran jest tylko dla administratora. Twoje konto ma rolę „Serwis”.</p>
        </div>
      </div>
    </PanelShell>
  )
}
