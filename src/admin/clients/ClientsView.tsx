import type { AdminViewServerProps } from 'payload'

import { entryQuery, type ClientRow } from '../../lib/clients'
import { zl } from '../../lib/pricing/format'
import { panelAccess } from '../access'
import { initials, whenLabel } from '../inquiries/format'
import { DataTable, type Column } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { loadClients } from './load'

const TITLE = 'Klienci'

/**
 * /admin/klienci (panel spec §1: no board — `DataTable` like the prices centre). Admin only.
 * Inquiries, orders and accounts grouped by the normalised e-mail; each row opens the client card
 * by a record id, never by the address.
 */
export async function ClientsView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title={TITLE}
        path="/klienci"
        active="clients"
      />
    )
  }
  const admin = req.payload.config.routes.admin
  const now = new Date()
  const rows = await loadClients(req.payload)

  const columns: Column<ClientRow>[] = [
    {
      key: 'name',
      label: 'Klient',
      render: (r) => (
        <a className="pn-who" href={`${admin}/klient${entryQuery(r.entry)}`}>
          <span className="pn-av" aria-hidden="true">
            {initials(r.name)}
          </span>
          <b>{r.name}</b>
        </a>
      ),
    },
    { key: 'last', label: 'Ostatni kontakt', render: (r) => whenLabel(r.lastContact, now) },
    { key: 'inquiries', label: 'Zapytania', align: 'right', render: (r) => r.inquiries },
    { key: 'orders', label: 'Zamówienia', align: 'right', render: (r) => r.orders },
    { key: 'spent', label: 'Wydał', align: 'right', render: (r) => (r.spent ? zl(r.spent) : '—') },
  ]

  return (
    <PanelShell req={req} title={TITLE} active="clients">
      {/* TODO(krystian): the lead and the empty state — no board for this screen. */}
      <PanelPage
        title={TITLE}
        lead="Zapytania, zamówienia i konta zebrane po adresie e-mail. Karta klienta pokazuje całą historię i dane do RODO."
      />
      {rows.length === 0 ? (
        <EmptyState title="Nie ma jeszcze klientów" icon="user">
          Pojawią się po pierwszym zapytaniu ze strony.
        </EmptyState>
      ) : (
        <DataTable caption="Klienci" columns={columns} rows={rows} rowKey={(r) => r.email} />
      )}
    </PanelShell>
  )
}
