import type { AdminViewServerProps } from 'payload'

import { zl } from '../../lib/pricing/format'
import { plural } from '../../lib/pl'
import { panelAccess } from '../access'
import { Kpi } from '../ui/Card'
import { Icon } from '../ui/icons'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { loadBoard } from './load'
import { OrdersBoard } from './OrdersBoard'

const TITLE = 'Zamówienia i warsztat'

const shortDay = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${Number(d)}.${m}`
}

/**
 * /admin/zamowienia (panel spec §7, board Zamowienia, stany/tel-07-warsztat). Both panel roles:
 * the `serwis` role starts here (spec §2a pt 3) and sees no amounts. Never costs or margins in
 * the HTML. 4 tiles, the 7-stage board (on the phone columns swiped with a finger) and the order
 * panel with the service checklist and „Przesuń do”.
 */
export async function OrdersView({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'staff')
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title={TITLE}
        path="/zamowienia"
        active="orders"
      />
    )
  }
  const admin = req.payload.config.routes.admin
  const isAdmin = panelAccess(req, 'admin').ok
  const data = await loadBoard(req.payload, new Date(), { prices: isAdmin })
  const { tiles } = data
  // `?z=<id>` (Pulpit „Warsztat”): that order open in the panel — an id only.
  const asked = Number(Array.isArray(searchParams?.z) ? searchParams.z[0] : searchParams?.z)
  const firstId = data.columns.some((c) => c.cards.some((card) => card.id === asked))
    ? asked
    : data.firstId

  return (
    <PanelShell req={req} title={TITLE} active="orders">
      <PanelPage
        title={TITLE}
        lead="Każdy komputer od przyjętej oferty do wysyłki. Przesuwasz etap tutaj, a klient widzi go w swoim koncie; na stronie głównej tablica pokazuje tylko nazwę zestawu i etap."
        actions={
          isAdmin ? (
            <>
              <a className="pn-btn" href={`${admin}/zapytania`}>
                <Icon name="mail" />Z zapytania
              </a>
              <a className="pn-btn pn-btn--gold" href={`${admin}/collections/orders/create`}>
                <Icon name="plus" />
                Nowe zamówienie
              </a>
            </>
          ) : null
        }
      />
      <div className={`pn-grid ${isAdmin ? 'pn-g4' : 'pn-g3'}`}>
        <Kpi label="W realizacji" value={String(tiles.inWork)} note="od opłaty do wysyłki" />
        <Kpi
          label="Do wysłania w tym tygodniu"
          value={String(tiles.dueThisWeek)}
          tone={tiles.dueThisWeek > 0 ? 'gold' : undefined}
          note={tiles.nearestDue ? `najbliższy termin: ${shortDay(tiles.nearestDue)}` : undefined}
        />
        <Kpi
          label="Średni czas realizacji"
          value={tiles.avgDays === null ? '—' : `${tiles.avgDays} dni rob.`}
          note={data.promise ? `obietnica na stronie: ${data.promise}` : undefined}
        />
        {/* Amounts for the admin only — `serwis` sees no prices (spec §15). */}
        {isAdmin ? (
          <Kpi
            label="Wartość w realizacji"
            value={zl(tiles.value)}
            note={`${tiles.valueCount} ${plural(tiles.valueCount, ['komputer', 'komputery', 'komputerów'])}`}
          />
        ) : null}
      </div>
      <OrdersBoard
        columns={data.columns}
        firstId={firstId}
        stageEmail={data.stageEmail}
        admin={admin}
        canSeeClient={isAdmin}
      />
    </PanelShell>
  )
}
