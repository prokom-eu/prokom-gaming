import type { ServerProps } from 'payload'

import { panelAccess } from '../access'
import { shortCount } from '../ui/count'
import { loadShell } from './load'
import { navGroups, type NavItem } from './navModel'

/**
 * The panel's own screens above Payload's collection groups on Payload's lists and forms
 * (`admin.components.beforeNavLinks`, panel spec §2 "Nawigacja"): the same groups and counters
 * as the sidebar of the custom views, so the way back to "Panel" is always there (spec §2a pt 1).
 * Payload's own groups below are the data lists ("Dane").
 */
export async function PanelNavLinks({ payload, user }: Partial<ServerProps>) {
  if (!payload || !panelAccess({ user: user ?? null }, 'staff').ok) return null
  const admin = payload.config.routes.admin
  const shell = await loadShell(payload, user ?? null)
  const count = (item: NavItem) => (item.counter ? (shell.counts[item.counter] ?? 0) : 0)
  return (
    <div className="pn-navlinks">
      {navGroups(shell.role)
        .map((g) => ({ ...g, items: g.items.filter((i) => i.key !== 'data') }))
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <nav key={group.label} aria-label={`Panel: ${group.label}`}>
            <h2>{group.label}</h2>
            {group.items.map((item) => {
              const n = count(item)
              const tone =
                item.tone === 'bad' ? ' pn-bd--bad' : item.tone === 'gold' ? ' pn-bd--gold' : ''
              return (
                <a key={item.key} href={`${admin}${item.path}`} className="nav__link">
                  <span className="nav__link-label">{item.label}</span>
                  {n > 0 ? <span className={`pn-bd${tone}`}>{shortCount(n)}</span> : null}
                </a>
              )
            })}
          </nav>
        ))}
      <h2>Dane (listy)</h2>
    </div>
  )
}
