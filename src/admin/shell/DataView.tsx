import type { AdminViewServerProps } from 'payload'

import { panelAccess } from '../access'
import { Card } from '../ui/Card'
import { Icon } from '../ui/icons'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'

type Entry = { slug: string; label: string; href: string; group: string }

const text = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback)

/**
 * "Więcej → Dane (listy)" (panel spec §2a pt 1): Payload's own lists and settings, grouped as in
 * Payload's nav — only those the account may read (Payload's own access, like its nav).
 * The way into the advanced/emergency view of every collection (ADR-G006 §4); from there the
 * Payload menu leads back to the panel. Any panel role.
 */
export async function DataView({ initPageResult }: AdminViewServerProps) {
  const { req, visibleEntities, permissions } = initPageResult
  const access = panelAccess(req, 'staff')
  if (!access.ok) {
    return <PanelDenied req={req} reason={access.reason} title="Dane (listy)" path="/dane" />
  }
  const { config } = req.payload
  const admin = config.routes.admin
  const entries: Entry[] = [
    ...config.collections
      .filter((c) => visibleEntities.collections.includes(c.slug))
      .filter((c) => permissions.collections?.[c.slug]?.read)
      .map((c) => ({
        slug: c.slug,
        label: text(c.labels?.plural, c.slug),
        href: `${admin}/collections/${c.slug}`,
        group: text(c.admin?.group, 'Inne'),
      })),
    ...config.globals
      .filter((g) => visibleEntities.globals.includes(g.slug))
      .filter((g) => permissions.globals?.[g.slug]?.read)
      .map((g) => ({
        slug: g.slug,
        label: text(g.label, g.slug),
        href: `${admin}/globals/${g.slug}`,
        group: text(g.admin?.group, 'Inne'),
      })),
  ]
  const groups = [...new Set(entries.map((e) => e.group))]

  return (
    <PanelShell req={req} title="Dane (listy)" active="data" crumbs={[{ label: 'System' }]}>
      {/* TODO(krystian): lead text — no board for this screen. */}
      <PanelPage
        title="Dane (listy)"
        lead="Listy i formularze Payload — widok zaawansowany każdej kolekcji. Codzienna praca jest w ekranach panelu."
      />
      <div className="pn-grid pn-g3">
        {groups.map((group) => (
          <Card key={group} title={group}>
            <ul className="pn-datalist">
              {entries
                .filter((e) => e.group === group)
                .map((e) => (
                  <li key={e.slug}>
                    <a className="pn-ni" href={e.href}>
                      <Icon name="archive" />
                      <span>{e.label}</span>
                    </a>
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>
    </PanelShell>
  )
}
