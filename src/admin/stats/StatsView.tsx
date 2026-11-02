import type { AdminViewServerProps } from 'payload'

import { zl } from '../../lib/pricing/format'
import { panelAccess } from '../access'
import { Card, Kpi } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { DataTable, type Column } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { loadStats, type BuildRow, type StatsData } from './load'
import { num, pct, periodOf, PERIODS, type ShareRow } from './model'
import styles from './stats.module.css'
import { TrafficChart } from './TrafficChart'

const TITLE = 'Statystyki strony'
const LEAD =
  'Ruch ze statystyk bez ciasteczek (Umami na naszym serwerze), zapytania i sprzedaż z panelu. Bez danych osobowych.'

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * /admin/statystyki (panel spec §12, ADR-G009 pt 4, board Statystyki, stany/tel-10). Admin only —
 * `serwis` gets "403" (no sales statistics, spec §15). Traffic from Umami; without it the traffic
 * sections are hidden and the database numbers stay (spec §18 pt 2). The period is in the address
 * (`?okres=7`) — a number, never anything personal.
 */
export async function StatsView({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title={TITLE}
        path="/statystyki"
        active="stats"
      />
    )
  }
  const admin = req.payload.config.routes.admin
  const days = periodOf(one(searchParams?.okres))
  const data = await loadStats(req.payload, new Date(), days)
  const on = data.traffic === 'on'

  return (
    <PanelShell req={req} title={TITLE} active="stats" crumbs={[]}>
      <PanelPage
        title={TITLE}
        lead={LEAD}
        actions={
          <nav className="pn-seg" aria-label="Okres">
            {PERIODS.map((p) => (
              <a
                key={p}
                href={`${admin}/statystyki?okres=${p}`}
                aria-current={p === days ? 'page' : undefined}
              >
                Ostatnie {p} dni
              </a>
            ))}
          </nav>
        }
      />
      {on ? null : <TrafficMissing state={data.traffic} />}
      <Tiles data={data} />

      <Card
        title="Ruch i zapytania"
        className={styles.wide}
        actions={
          <span className="pn-chips">
            {on ? <Chip tone="gold">odwiedzający</Chip> : null}
            <Chip tone="info">zapytania</Chip>
          </span>
        }
      >
        <TrafficChart
          days={data.period.dayKeys}
          visitors={data.visitorsSeries}
          inquiries={data.inquiriesSeries}
        />
      </Card>

      <div className={styles.cols2}>
        <FunnelCard data={data} />
        {data.sources ? (
          <Card title="Skąd przychodzą">
            <Bars rows={data.sources} digits={0} empty="Jeszcze nie ma wejść." />
          </Card>
        ) : null}
      </div>

      <div className={on ? styles.cols3 : styles.cols2}>
        <BuildsCard rows={data.builds} withViews={on} />
        {data.games ? (
          <Card title="Gry wybierane w doborze">
            {/* TODO(krystian): empty-state sentence. */}
            <Bars rows={data.games} digits={0} empty="Nikt jeszcze nie wybrał gry w doborze." />
          </Card>
        ) : null}
        {on ? <DevicesCard data={data} /> : null}
      </div>
    </PanelShell>
  )
}

// TODO(krystian): both sentences — the board has no state without statistics.
function TrafficMissing({ state }: { state: StatsData['traffic'] }) {
  return (
    <div className={styles.missing}>
      <EmptyState
        title={
          state === 'off' ? 'Statystyki ruchu są wyłączone' : 'Statystyki ruchu nie odpowiadają'
        }
        icon="chart"
      >
        {state === 'off'
          ? 'Ruch na stronie pojawi się po podłączeniu Umami. Zapytania i sprzedaż liczymy z panelu.'
          : 'Umami nie odpowiedział — spróbuj za kilka minut. Zapytania i sprzedaż liczymy z panelu.'}
      </EmptyState>
    </div>
  )
}

function Tiles({ data }: { data: StatsData }) {
  return (
    <div className="pn-grid pn-g4">
      {data.visitors !== null ? (
        <Kpi
          label="Odwiedzający"
          value={num(data.visitors)}
          note="unikalni, bez ciasteczek"
          spark={data.visitorsSeries ?? undefined}
        />
      ) : null}
      <Kpi
        label="Zapytania"
        value={num(data.inquiries)}
        tone="gold"
        note={data.conversion !== null ? `konwersja ${pct(data.conversion, 2)}` : undefined}
        spark={data.inquiriesSeries}
      />
      <Kpi
        label="Zamówienia"
        value={num(data.orders)}
        note={
          data.orderRate !== null ? `${pct(data.orderRate)} zapytań kończy się zakupem` : undefined
        }
        spark={data.ordersSeries}
      />
      <Kpi
        label="Przychód z zamówień"
        value={zl(data.revenue)}
        note={data.average !== null ? `średnio ${zl(data.average)} za komputer` : undefined}
        spark={data.revenueSeries}
      />
    </div>
  )
}

function FunnelCard({ data }: { data: StatsData }) {
  const steps = data.funnel.filter((s) => s.count !== null)
  const top = Math.max(1, ...steps.map((s) => s.count ?? 0))
  return (
    <Card title="Lejek sprzedaży" note="od wejścia do zamówienia">
      <ol className={styles.funnel}>
        {steps.map((s) => (
          <li key={s.label}>
            <span className={styles.funnelLabel}>{s.label}</span>
            <span className={styles.funnelTrack} aria-hidden="true">
              <span style={{ width: `${Math.max(1.5, ((s.count ?? 0) / top) * 100)}%` }} />
            </span>
            <b className={styles.funnelValue}>{num(s.count)}</b>
            <small className={styles.funnelShare}>
              {s.fromPrevious !== null ? (
                <>
                  <span className="pn-sr">, z poprzedniego kroku </span>
                  {pct(s.fromPrevious)}
                </>
              ) : null}
            </small>
          </li>
        ))}
      </ol>
      <p className="pn-note">
        Ostatnia kolumna: ile osób przeszło z poprzedniego kroku.{data.loss ? ` ${data.loss}` : ''}
      </p>
    </Card>
  )
}

/** Horizontal bars with a share (sources, games, entries). */
function Bars({ rows, digits, empty }: { rows: ShareRow[]; digits: number; empty: string }) {
  if (rows.length === 0) return <p className="pn-mu">{empty}</p>
  const top = Math.max(...rows.map((r) => r.share))
  return (
    <ul className={styles.bars}>
      {rows.map((r) => (
        <li key={r.label}>
          <span>{r.label}</span>
          <b>{pct(r.share, digits)}</b>
          <span className={styles.barTrack} aria-hidden="true">
            <span style={{ width: `${(r.share / top) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function BuildsCard({ rows, withViews }: { rows: BuildRow[]; withViews: boolean }) {
  const columns: Column<BuildRow>[] = [
    {
      key: 'name',
      label: 'Zestaw',
      render: (b) => (
        <span className="pn-build">
          <span
            className="pn-sigil"
            aria-hidden="true"
            style={{
              ['--sigil' as string]: `url(/sigils/${b.sigil}-plain.svg)`,
              color: `var(--c-${b.slug}, var(--p-gold))`,
            }}
          />
          <b className="pn-build__name">{b.name}</b>
        </span>
      ),
    },
    ...(withViews
      ? [
          {
            // Umami counts visitors of the page, not page views — „Odw.” instead of the board's
            // „Wyśw.” (STAN, P8).
            key: 'views',
            label: 'Odw.',
            align: 'right' as const,
            render: (b: BuildRow) => num(b.views),
          },
        ]
      : []),
    { key: 'inquiries', label: 'Zapyt.', align: 'right', render: (b) => num(b.inquiries) },
    ...(withViews
      ? [
          {
            key: 'conversion',
            label: 'Konw.',
            align: 'right' as const,
            render: (b: BuildRow) => pct(b.conversion, 2),
          },
        ]
      : []),
  ]
  return (
    <Card title="Najczęściej oglądane zestawy" className={styles.flush}>
      {rows.length === 0 ? (
        // TODO(krystian): empty-state sentence.
        <EmptyState title="Jeszcze nikt nie oglądał zestawów" icon="box" />
      ) : (
        <DataTable
          caption="Najczęściej oglądane zestawy"
          columns={columns}
          rows={rows}
          rowKey={(b) => b.slug}
        />
      )}
    </Card>
  )
}

function DevicesCard({ data }: { data: StatsData }) {
  const d = data.devices
  return (
    <Card title="Urządzenia i strony wejścia">
      {d ? (
        <>
          <div className={styles.devBar} aria-hidden="true">
            <span className={styles.devPhone} style={{ width: `${d.phone * 100}%` }} />
            <span className={styles.devComputer} style={{ width: `${d.computer * 100}%` }} />
            <span className={styles.devTablet} style={{ width: `${d.tablet * 100}%` }} />
          </div>
          <p className="pn-chips">
            <Chip tone="gold">telefon {pct(d.phone, 0)}</Chip>
            <Chip tone="info">komputer {pct(d.computer, 0)}</Chip>
            <Chip tone="mu">tablet {pct(d.tablet, 0)}</Chip>
          </p>
        </>
      ) : null}
      {data.entries && data.entries.length > 0 ? (
        <dl className={styles.entries}>
          {data.entries.map((e) => (
            <div key={e.label}>
              <dt>{e.label}</dt>
              <dd>{pct(e.share, 0)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        // TODO(krystian): empty-state sentence.
        <p className="pn-mu">Jeszcze nie ma wejść.</p>
      )}
    </Card>
  )
}
