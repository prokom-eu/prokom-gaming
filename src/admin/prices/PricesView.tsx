import { dateTime } from '../price-reports/format'
import { latestReport } from '../price-reports/load'
import type { AdminViewServerProps } from 'payload'

import { percentShort } from '../../lib/pricing/format'
import { whatIfBuilds } from '../../lib/pricing/preview'
import { plural } from '../../lib/pl'
import { panelAccess } from '../access'
import { Alert } from '../ui/Alert'
import { Card, Kpi } from '../ui/Card'
import { Icon } from '../ui/icons'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { CostImport } from './CostImport'
import { loadPrices, type PriceItem, type PricesData } from './load'
import styles from './panelPrices.module.css'
import { PriceTable, type PriceRowView } from './PriceTable'
import { WhatIfCard } from './WhatIfCard'

const TITLE = 'Centrum cen'
const LEAD =
  'Wszystkie pozycje cennika: koszt zakupu, cena na stronie i to, co wynika z dzisiejszych kosztów. Ceny sprzedaży liczy cennik; Ty zmieniasz koszty, narzuty i zatwierdzasz.'

const dateShort = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
})

/**
 * /admin/ceny — Centrum cen (panel spec §8, board Ceny, stany/tel-08): tiles, „Co jeśli?”, every
 * sold item with costs, prices and status, and the CSV cost import from G4. Publishing lives in
 * „Do zatwierdzenia”. Admin only — custom views are public by definition, so the check is first.
 */
export async function PricesView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'admin')
  // Nothing about prices is loaded before this.
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title={TITLE}
        path="/ceny"
        active="pricesCentre"
      />
    )
  }
  const admin = req.payload.config.routes.admin
  const [data, report] = await Promise.all([loadPrices(req.payload), latestReport(req.payload)])
  const queueCount = 'error' in data ? 0 : data.queue.items.length

  return (
    <PanelShell req={req} title={TITLE} active="pricesCentre" crumbs={[{ label: 'Ceny' }]}>
      {/* data-prices-screen: the e2e accessibility check scans this screen only. */}
      <div data-prices-screen>
        <PanelPage
          title={TITLE}
          lead={LEAD}
          actions={
            <a className="pn-btn" href={`${admin}/ceny/zatwierdzanie`}>
              <Icon name="check" />
              Do zatwierdzenia · {queueCount}
            </a>
          }
        />
        {'error' in data ? (
          <Alert title="Nie można policzyć cen">{data.error}</Alert>
        ) : (
          <Centre data={data} admin={admin} report={report} />
        )}
      </div>
    </PanelShell>
  )
}

function Centre({
  data,
  admin,
  report,
}: {
  data: PricesData
  admin: string
  report: Awaited<ReturnType<typeof latestReport>>
}) {
  // The last price check (P7): items without a usable offer; a part marks its levels.
  const missing = new Set<string>()
  for (const item of report?.diff.items ?? []) {
    if (item.decision.kind !== 'unavailable') continue
    if (item.itemType === 'option') missing.add(`option:${item.code}`)
    else for (const level of item.levels) missing.add(`level:${level}`)
  }
  const missingUsed = (report?.diff.items ?? []).filter(
    (i) => i.decision.kind === 'unavailable' && i.builds.length > 0,
  )
  const { offer, current, queue, items, levelParts, warnMargin } = data
  const { minMargin, publishThreshold } = offer.catalog.settings
  const batchShort = dateShort.format(new Date(current.snapshot.publishedAt))
  const rows = items.map((item) => toRow(item, queue, missing))
  const queued = rows.filter((r) => r.status !== 'same' && r.status !== 'minor').length
  const minor = rows.filter((r) => r.status === 'minor').length
  const levels = items.filter((i) => i.category === 'level').length
  const parts = [...levelParts.values()].reduce((n, p) => n + p.length, 0)
  const options = items.filter((i) => i.category !== 'level' && i.category !== 'service').length

  return (
    <div className={styles.stack}>
      {queue.brokenLevels.length > 0 ? (
        // The guard over the prices on the site (G4): urgent, so on top of the centre.
        <Alert
          title="Pilne: opublikowane ceny przy dzisiejszych kosztach łamią marżę."
          actions={
            <a className="pn-btn pn-btn--gold pn-btn--sm" href={`${admin}/ceny/zatwierdzanie`}>
              Do zatwierdzenia
            </a>
          }
        >
          {/* TODO(krystian): sentence not on the board. The fix per level is on „Do zatwierdzenia”. */}
          {plural(queue.brokenLevels.length, ['Poziom', 'Poziomy', 'Poziomy'])}{' '}
          {queue.brokenLevels.map((p) => p.level).join(', ')} poniżej minimum{' '}
          {percentShort(minMargin)} przy cenach ze strony — co podnieść, pokazuje strażnik.
        </Alert>
      ) : null}
      <div className={styles.kpis}>
        <Kpi
          label="Pozycje w cenniku"
          value={String(items.length)}
          note={`${levels} poziomów (${parts} części), ${options} opcji, usługa`}
        />
        <Kpi
          label={`Zmienione od ${batchShort}`}
          value={String(queued + minor)}
          tone={queued > 0 ? 'gold' : undefined}
          note={`${queued} powyżej progu ${percentShort(publishThreshold)}, ${minor} poniżej`}
        />
        {report ? (
          <>
            <Kpi
              label="Niedostępne"
              value={String(missingUsed.length)}
              tone={missingUsed.length > 0 ? 'bad' : undefined}
              note={
                missingUsed.length > 0
                  ? missingUsed
                      .slice(0, 2)
                      .map((i) => `${i.title} · ${i.builds.join(', ')}`)
                      .join('; ')
                  : 'wszystkie części z zestawów mają ofertę'
              }
            />
            <Kpi
              label="Ostatnie sprawdzenie"
              value={dateTime(report.startedAt)}
              note={
                <a className="pn-link" href={`${admin}/raporty-cen/${report.id}`}>
                  Claude · {report.diff.totals.found} z {report.diff.totals.items} pozycji
                  znalezionych
                </a>
              }
            />
          </>
        ) : (
          <>
            {/* TODO(krystian): sentences before the first check. */}
            <Kpi label="Niedostępne" value="—" note="po pierwszym sprawdzeniu cen" />
            <Kpi label="Ostatnie sprawdzenie" value="—" note="jeszcze nie sprawdzano cen" />
          </>
        )}
      </div>

      <WhatIfCard
        builds={whatIfBuilds(offer.builds, offer.catalog, current.snapshot, levelParts)}
        minMargin={minMargin}
        warnMargin={warnMargin}
      />

      <PriceTable
        rows={rows}
        batchShort={batchShort}
        minMargin={minMargin}
        warnMargin={warnMargin}
      />

      <Card title="Import kosztów (CSV)" note="kod lub EAN; koszt">
        <CostImport />
      </Card>
    </div>
  )
}

function toRow(item: PriceItem, queue: PricesData['queue'], missing: Set<string>): PriceRowView {
  const queued = queue.items.find((q) => q.key === item.key)
  const status: PriceRowView['status'] = queued
    ? queued.reasons.includes('urgent')
      ? 'urgent'
      : queued.reasons.includes('new')
        ? 'new'
        : 'queued'
    : item.published !== null && item.candidate !== item.published
      ? 'minor'
      : 'same'
  return {
    key: item.key,
    category: item.category,
    title: item.title,
    detail: item.detail,
    costAtBatch: item.costAtBatch,
    costToday: item.costToday,
    published: item.published,
    candidate: item.candidate,
    margin: item.margin,
    costSource: item.costSource,
    status,
    unavailable: missing.has(item.key),
    editPath: item.editPath,
  }
}
