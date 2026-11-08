import type { AdminViewServerProps } from 'payload'

import type { CheckDiff } from '../../lib/price-check/diff'
import { panelAccess } from '../access'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { DataTable, type Column } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { STATUS, dateTime } from './format'

const TITLE = 'Raporty cen'

type Row = {
  id: number
  startedAt: string
  trigger: string
  status: keyof typeof STATUS
  found: string
  proposals: number | null
  cost: number
  unread: boolean
}

/**
 * /admin/raporty-cen — the list of price checks (panel spec §1: date, trigger, status, found,
 * cost, alarms; `DataTable`, no board). Admin only.
 */
export async function ReportsView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title={TITLE}
        path="/raporty-cen"
        active="reports"
      />
    )
  }
  const admin = req.payload.config.routes.admin
  const checks = await req.payload.find({
    collection: 'price-checks',
    sort: '-startedAt',
    limit: 50,
    select: {
      startedAt: true,
      trigger: true,
      status: true,
      itemsTotal: true,
      itemsFound: true,
      costUsd: true,
      readAt: true,
      diff: true,
    },
    depth: 0,
    overrideAccess: true,
  })
  const rows: Row[] = checks.docs.map((c) => ({
    id: c.id,
    startedAt: c.startedAt,
    trigger: c.trigger === 'schedule' ? 'z harmonogramu' : 'ręcznie',
    status: c.status,
    found: `${c.itemsFound ?? 0} z ${c.itemsTotal ?? 0}`,
    proposals: c.diff ? (c.diff as CheckDiff).totals.proposals : null,
    cost: c.costUsd ?? 0,
    unread: !c.readAt && c.status !== 'running',
  }))

  const columns: Column<Row>[] = [
    {
      key: 'date',
      label: 'Data',
      render: (r) => (
        <a className="pn-link" href={`${admin}/raporty-cen/${r.id}`}>
          {r.unread ? <b>{dateTime(r.startedAt)}</b> : dateTime(r.startedAt)}
          {r.unread ? <span className="pn-sr"> (nowy)</span> : null}
        </a>
      ),
    },
    { key: 'trigger', label: 'Uruchomienie', render: (r) => r.trigger },
    {
      key: 'status',
      label: 'Stan',
      render: (r) => <Chip tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Chip>,
    },
    { key: 'found', label: 'Znalezione', align: 'right', render: (r) => r.found },
    { key: 'proposals', label: 'Propozycje', align: 'right', render: (r) => r.proposals ?? '—' },
    {
      key: 'cost',
      label: 'Koszt',
      align: 'right',
      render: (r) => `${r.cost.toFixed(2).replace('.', ',')} USD`,
    },
  ]

  return (
    <PanelShell req={req} title={TITLE} active="reports" crumbs={[{ label: 'Ceny' }]}>
      <div data-reports-screen>
        {/* TODO(krystian): lead sentence (no board for the list). */}
        <PanelPage
          title={TITLE}
          lead="Każde sprawdzenie cen w sklepach: co Claude znalazł, ile kosztowało i co proponuje. Nic nie zmienia się na stronie samo."
        />
        <Card>
          {rows.length > 0 ? (
            <DataTable
              caption="Raporty cen"
              columns={columns}
              rows={rows}
              rowKey={(r) => String(r.id)}
            />
          ) : (
            // TODO(krystian): empty-state sentence.
            <EmptyState title="Jeszcze nie sprawdzano cen" icon="report">
              Pierwszy raport pojawi się po „Sprawdź ceny” albo w terminie z harmonogramu.
            </EmptyState>
          )}
        </Card>
      </div>
    </PanelShell>
  )
}
