import type { AdminViewServerProps } from 'payload'

import type { CheckDiff } from '../../lib/price-check/diff'
import { percentShort, signedZl, zl } from '../../lib/pricing/format'
import { panelAccess } from '../access'
import { Alert } from '../ui/Alert'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { DataTable, type Column } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { Icon } from '../ui/icons'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelShell } from '../ui/PanelShell'
import { STATUS, startLine } from './format'
import { competitorsBySlug, type Competitor } from './load'
import { AcceptButton, ItemsTable, Progress } from './ReportParts'
import styles from './reports.module.css'
import { expireStaleChecks } from '../../lib/price-check/scheduler'

const TITLE = 'Raport sprawdzenia cen'

const dateShort = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function idOf(params: AdminViewServerProps['params']): number | null {
  const segments = params?.segments
  const raw = Array.isArray(segments) ? segments[1] : undefined
  return typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : null
}

type BuildRow = CheckDiff['builds'][number] & { competitor: Competitor | null }

/**
 * /admin/raporty-cen/<id> — the report of one price check (panel spec §11, board Raport): the 5
 * steps, Claude's summary (only numbers of the diff), the part changes with offers, the impact on
 * the builds and „Przyjmij N propozycji”. Opening marks it read. Admin only.
 */
export async function ReportView({ initPageResult, params }: AdminViewServerProps) {
  const { req } = initPageResult
  const id = idOf(params)
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title={TITLE}
        path={id ? `/raporty-cen/${id}` : '/raporty-cen'}
        active="reports"
      />
    )
  }
  const { payload } = req
  const admin = payload.config.routes.admin
  const back = { href: `${admin}/raporty-cen`, label: 'Raporty cen' }
  // A run cut off by a restart must not refresh „w toku” forever.
  await expireStaleChecks(payload)
  const check = id
    ? await payload
        .findByID({
          collection: 'price-checks',
          id,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
        })
        .catch(() => null)
    : null

  const shell = (title: string, children: React.ReactNode) => (
    <PanelShell
      req={req}
      title={title}
      active="reports"
      back={back}
      crumbs={[{ label: 'Raporty cen', href: back.href }]}
    >
      <div data-reports-screen>{children}</div>
    </PanelShell>
  )
  if (!check) {
    return shell(
      TITLE,
      // TODO(krystian): sentence not on the board.
      <EmptyState title="Nie ma takiego raportu" icon="report">
        <a className="pn-link" href={back.href}>
          Wróć do listy raportów
        </a>
      </EmptyState>,
    )
  }
  if (check.status !== 'running' && !check.readAt) {
    await payload.update({
      collection: 'price-checks',
      id: check.id,
      data: { readAt: new Date().toISOString() },
      depth: 0,
      overrideAccess: true,
    })
  }

  const diff = (check.diff ?? null) as CheckDiff | null
  const competitors = await competitorsBySlug(payload)
  const status = STATUS[check.status]
  const minutes =
    check.finishedAt && check.startedAt
      ? Math.max(
          1,
          Math.round((Date.parse(check.finishedAt) - Date.parse(check.startedAt)) / 60_000),
        )
      : null

  const header = (
    <header className={styles.head}>
      <div className={styles.chips}>
        <Chip tone={status.tone}>{status.label}</Chip>
        <Chip tone="mu">
          {check.itemsTotal ?? 0} pozycji · {check.itemsFound ?? 0} znalezionych
        </Chip>
      </div>
      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.title}>{TITLE}</h1>
          <p className={styles.lead}>
            {startLine(check.startedAt)},{' '}
            {check.trigger === 'schedule' ? 'automatycznie' : 'ręcznie'}.
            {diff ? ` Porównanie z partią cen #${diff.totals.batch}.` : ''}
          </p>
        </div>
        <div className={styles.actions}>
          <a className="pn-btn" href={`${admin}/ceny`}>
            <Icon name="tag" />
            Centrum cen
          </a>
          {diff && check.status === 'done' ? (
            <AcceptButton
              checkId={check.id}
              count={diff.totals.proposals}
              accepted={Boolean(check.acceptedAt)}
              approveHref={`${admin}/ceny/zatwierdzanie`}
            />
          ) : null}
        </div>
      </div>
    </header>
  )

  if (check.status === 'running') {
    return shell(
      TITLE,
      <>
        {header}
        <Progress step={check.step ?? 'W kolejce'} value={check.progress ?? 0} />
      </>,
    )
  }

  const steps = [
    {
      title: 'Koszt zakupu',
      text: 'najniższa cena dostępnej oferty; koszty wpisane z faktury nie są nadpisywane',
    },
    {
      title: 'Sklepy',
      text: `${check.itemsFound ?? 0} z ${check.itemsTotal ?? 0} pozycji, ${check.pagesRead ?? 0} strony, ${check.searches ?? 0} wyszukiwań`,
    },
    {
      title: 'Konkurencja',
      text: `${competitors.size} odpowiedników wpisanych ręcznie`,
    },
    {
      title: 'Przeliczenie',
      text: diff ? 'marże i propozycje policzone cennikiem' : 'nie przeliczono',
    },
    {
      title: 'Raport i alarm',
      text: `${minutes ? `${minutes} min · ` : ''}koszt ok. ${(check.costUsd ?? 0).toFixed(2).replace('.', ',')} USD`,
    },
  ]

  const builds: BuildRow[] = (diff?.builds ?? [])
    .map((b) => ({ ...b, competitor: competitors.get(b.slug) ?? null }))
    .sort((a, b) => (a.priceNow ?? 0) - (b.priceNow ?? 0))
  const minMargin = diff?.totals.minMargin ?? 0.11
  const marginTone = (m: number | null) =>
    m === null || m < minMargin ? 'var(--p-bad)' : undefined
  const buildColumns: Column<BuildRow>[] = [
    { key: 'name', label: 'Zestaw', render: (b) => <b className="pn-build__name">{b.name}</b> },
    { key: 'now', label: 'Cena teraz', align: 'right', render: (b) => zl(b.priceNow) },
    {
      key: 'cost',
      label: 'Koszt z partii → dziś',
      align: 'right',
      render: (b) => `${zl(b.costBatch)} → ${zl(b.costNew)}`,
    },
    {
      key: 'marginNow',
      label: 'Marża dziś',
      align: 'right',
      render: (b) => (
        <span style={{ color: marginTone(b.marginNow) }}>{percentShort(b.marginNow)}</span>
      ),
    },
    { key: 'new', label: 'Nowa cena', align: 'right', render: (b) => <b>{zl(b.priceNew)}</b> },
    {
      key: 'change',
      label: 'Zmiana dla klienta',
      align: 'right',
      render: (b) => (b.change === null || b.change === 0 ? 'bez zmiany' : signedZl(b.change)),
    },
    {
      key: 'after',
      label: 'Marża po',
      align: 'right',
      render: (b) => (
        <span style={{ color: marginTone(b.marginAfter) }}>{percentShort(b.marginAfter)}</span>
      ),
    },
    {
      key: 'competitor',
      label: 'Konkurencja',
      render: (b) =>
        b.competitor ? (
          <span className={styles.mu}>
            {b.competitor.name}: {zl(b.competitor.price)} (
            {dateShort.format(new Date(b.competitor.checkedAt))})
          </span>
        ) : (
          <span className={styles.mu}>—</span>
        ),
    },
  ]

  return shell(
    TITLE,
    <div className={styles.stack}>
      {header}
      {check.error ? <Alert title={status.label}>{check.error}</Alert> : null}
      {diff && (diff.linksProposed ?? 0) > 0 ? (
        // TODO(krystian): wording (no board).
        <Alert
          tone="ok"
          title={`Claude znalazł ${linksLabel(diff.linksProposed ?? 0)} do ofert`}
          actions={
            <a
              className="pn-btn"
              href={`${admin}/collections/price-sources?where[active][equals]=false&where[proposedByClaude][equals]=true`}
            >
              Linki do ofert
            </a>
          }
        >
          Zapisały się jako wyłączone. Sprawdź je i włącz — kolejne sprawdzenie odczyta z nich ceny.
        </Alert>
      ) : null}

      <Card>
        <ol className={styles.steps}>
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className={styles.stepNo} aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <b>{s.title}</b>
                <small>{s.text}</small>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Najważniejsze" note="podsumowanie Claude">
        {check.summary ? (
          <div className={styles.summary}>
            {check.summary.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className={styles.note}>
                {renderBold(p)}
              </p>
            ))}
          </div>
        ) : (
          <p className={styles.mu}>Podsumowanie niedostępne — liczby w tabelach niżej.</p>
        )}
        <p className={styles.foot}>
          <Icon name="alert" size={14} />
          Ceny w sklepach znalazł Claude (przy każdej pozycji linki do ofert). Marże i nowe ceny
          policzył cennik w kodzie, tym samym wzorem co strona.
        </p>
      </Card>

      {diff ? (
        <>
          <ItemsTable items={diff.items} />
          <Card
            title="Wpływ na zestawy"
            note="ceny ze strony przy dzisiejszych kosztach i po zatwierdzeniu"
          >
            <DataTable
              caption="Wpływ na zestawy"
              columns={buildColumns}
              rows={builds}
              rowKey={(b) => b.slug}
            />
          </Card>
        </>
      ) : null}
    </div>,
  )
}

/** „1 nowy link”, „3 nowe linki”, „5 nowych linków”. */
function linksLabel(n: number) {
  if (n === 1) return '1 nowy link'
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
  return few ? `${n} nowe linki` : `${n} nowych linków`
}

/** „**RAM podrożał.** DDR5 …” → bold lead sentence; the rest as plain text (never HTML). */
function renderBold(paragraph: string) {
  const parts = paragraph.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part))
}
