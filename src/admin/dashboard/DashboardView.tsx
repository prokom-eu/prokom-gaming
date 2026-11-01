import type { AdminViewServerProps } from 'payload'

import { plural } from '../../lib/pl'
import { percentShort } from '../../lib/pricing/format'
import { ORDER_STAGE_CHOICES } from '../../lib/orders'
import { panelAccess } from '../access'
import { STATUS_CHIP, whenLabel } from '../inquiries/format'
import { Alert } from '../ui/Alert'
import { Card, Kpi } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { EmptyState } from '../ui/EmptyState'
import { Icon } from '../ui/icons'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { loadDashboard, loadWorkshop, type DashboardData, type WorkshopData } from './load'
import { MarginTable } from './MarginTable'
import type { TodoItem } from './rules'

const TITLE = 'Pulpit'

const today = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** „Piątek, 30 października 2026” (board Main). */
function longDate(now: Date): string {
  const text = today.format(now)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const LEAD = 'zapytania, warsztat, ceny i ruch w jednym miejscu.'

/**
 * /admin — Pulpit „Dziś” (panel spec §3, board Main, stany/tel-01-pulpit). Replaces Payload's
 * dashboard. Admin: tiles, „Czeka na Ciebie”, build margins, recent inquiries, workshop, events.
 * `serwis` (P2 decision): the workshop only — no inquiries, prices or margins in the HTML.
 * Market prices (P7) and traffic (P8) are empty states until their sessions.
 */
export async function DashboardView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'staff')
  if (!access.ok) {
    return <PanelDenied req={req} reason={access.reason} title={TITLE} path="" active="dashboard" />
  }
  const now = new Date()
  const admin = req.payload.config.routes.admin

  if (panelAccess(req, 'admin').ok === false) {
    const workshop = await loadWorkshop(req.payload)
    return (
      <PanelShell req={req} title={TITLE} active="dashboard">
        <PanelPage title="Dziś" lead={longDate(now)} />
        <WorkshopCard workshop={workshop} href={`${admin}/collections/orders`} />
      </PanelShell>
    )
  }

  const data = await loadDashboard(req.payload, now)
  return (
    <PanelShell req={req} title={TITLE} active="dashboard">
      <PanelPage
        title="Dziś"
        lead={`${longDate(now)} · ${LEAD}`}
        actions={
          // „Statystyki” comes with its screen (P8).
          <a className="pn-btn" href={`${admin}/zapytania`}>
            <Icon name="mail" />
            Zapytania
          </a>
        }
      />
      <PhoneAlarm data={data} href={`${admin}/ceny/zatwierdzanie`} />
      <Tiles data={data} />
      <TodoCard items={data.todo} admin={admin} />

      <div className="pn-dash__cols">
        {data.prices.ok ? (
          <MarginTable
            builds={data.prices.view.builds}
            modes={data.prices.view.modes}
            minMargin={data.prices.view.minMargin}
            warnMargin={data.prices.view.warnMargin}
            batchShort={data.prices.batchShort}
            batchDate={data.prices.batchDate}
            queueCount={data.prices.view.queueCount}
          />
        ) : (
          <Card title="Marża gotowych zestawów" className="pn-dash__margins">
            <EmptyState title={pricesProblem(data.prices.reason)} icon="tag" />
          </Card>
        )}

        <div className="pn-dash__side">
          <RecentCard data={data} admin={admin} />
          <WorkshopCard workshop={data.workshop} href={`${admin}/collections/orders`} />
          <Card title="Ceny na rynku">
            {/* TODO(krystian): empty-state sentence — the price check comes with P7. */}
            <EmptyState title="Brak raportu cen" icon="report">
              Ceny ze sklepów pojawią się po pierwszym sprawdzeniu cen.
            </EmptyState>
          </Card>
        </div>

        <Card title="Ruch na stronie" note="30 dni · bez ciasteczek">
          {/* TODO(krystian): empty-state sentence — statistics (Umami) come with P8. */}
          <EmptyState title="Statystyki jeszcze nie działają" icon="chart">
            Ruch na stronie pojawi się po podłączeniu statystyk.
          </EmptyState>
        </Card>

        <EventsCard data={data} now={now} />
      </div>
    </PanelShell>
  )
}

// TODO(krystian): texts when prices cannot be shown — not on the board.
function pricesProblem(reason: 'no-batch' | 'error'): string {
  return reason === 'no-batch'
    ? 'Nie ma jeszcze opublikowanych cen.'
    : 'Nie udało się policzyć marż — szczegóły na ekranie Ceny.'
}

/** Phone only (spec §3, tel-01): the broken minimum on top, with the action under the thumb. */
function PhoneAlarm({ data, href }: { data: DashboardData; href: string }) {
  if (!data.prices.ok) return null
  const { lowest, minMargin, queueCount } = data.prices.view
  if (lowest.today === null || lowest.today === undefined || lowest.today >= minMargin) return null
  // „Zatwierdź 3 ceny” (accusative) vs „zatwierdzenie 3 cen” (genitive after the noun).
  const n = `${queueCount} ${plural(queueCount, ['cenę', 'ceny', 'cen'])}`
  const ofN = `${queueCount} ${plural(queueCount, ['ceny', 'cen', 'cen'])}`
  const after = lowest.after ?? null
  const weakest = `Najsłabsza konfiguracja: ${percentShort(lowest.today)}.`
  // TODO(krystian): the board starts with the cause from the price report („RAM DDR5 +8%.”, P7);
  // the sentences when approval is not enough are ours.
  const text =
    queueCount === 0 || after === null
      ? weakest
      : after >= minMargin
        ? `${weakest} Zatwierdzenie ${ofN} przywraca ${percentShort(after)}.`
        : `${weakest} Po zatwierdzeniu ${ofN} nadal ${percentShort(after)} — popraw dane albo narzut.`
  return (
    <div className="pn-dash__alarm">
      <Alert
        title={`Marża poniżej ${percentShort(minMargin)}`}
        actions={
          queueCount > 0 ? (
            <a className="pn-btn pn-btn--gold" href={href}>
              <Icon name="check" />
              Zatwierdź {n}
            </a>
          ) : undefined
        }
      >
        {text}
      </Alert>
    </div>
  )
}

function Tiles({ data }: { data: DashboardData }) {
  const { inquiries } = data
  const diff = inquiries.today - inquiries.yesterday
  // TODO(krystian): „tyle co wczoraj” for no change — the board only shows „+1 wobec wczoraj”.
  const vsYesterday =
    diff === 0 ? 'tyle co wczoraj' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} wobec wczoraj`
  const waiting = `${inquiries.waiting} ${plural(inquiries.waiting, ['czeka', 'czekają', 'czeka'])}`
  const view = data.prices.ok ? data.prices.view : null
  const batchShort = data.prices.ok ? data.prices.batchShort : ''
  const lowBad =
    view?.lowest.today !== null &&
    view?.lowest.today !== undefined &&
    view.lowest.today < view.minMargin

  return (
    <div className="pn-grid pn-g4 pn-dash__kpis">
      <Kpi
        label="Zapytania dziś"
        value={String(inquiries.today)}
        note={`${vsYesterday} · ${waiting}`}
        spark={inquiries.series}
      />
      {/* „Odwiedzający dziś” disappears without Umami (spec §3 pt 2) — until P8. */}
      <Kpi
        label="Średnia marża gotowców"
        value={percentShort(view?.average.today ?? null)}
        note={
          view?.average.batch !== undefined && view.average.batch !== null
            ? `było ${percentShort(view.average.batch)} przy cenach z ${batchShort}`
            : undefined
        }
      />
      <Kpi
        label="Najniższa marża w konfiguratorze"
        value={percentShort(view?.lowest.today ?? null)}
        tone={lowBad ? 'bad' : undefined}
        note={
          view
            ? `minimum ${percentShort(view.minMargin)}${
                view.lowest.after !== undefined && view.lowest.after !== null
                  ? ` · po zatwierdzeniu ${percentShort(view.lowest.after)}`
                  : ''
              }`
            : undefined
        }
      />
    </div>
  )
}

const TODO_TONE = (item: TodoItem) =>
  item.urgent ? 'bad' : item.kind === 'queue' ? 'warn' : 'gold'

function TodoCard({ items, admin }: { items: TodoItem[]; admin: string }) {
  const urgent = items.filter((i) => i.urgent).length
  return (
    <Card
      title="Czeka na Ciebie"
      note="od najpilniejszego"
      className="pn-dash__todo"
      actions={
        urgent > 0 ? (
          <Chip tone="bad">
            {urgent} {plural(urgent, ['pilne', 'pilne', 'pilnych'])}
          </Chip>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyState title="Wszystko załatwione" icon="check" />
      ) : (
        <ul className="pn-todo">
          {items.map((item) => (
            <li key={item.key} className="pn-todo__item">
              <span className={`pn-todo__ic pn-todo__ic--${TODO_TONE(item)}`}>
                <Icon name={item.icon} size={18} />
              </span>
              <div className="pn-todo__tx">
                <b>{item.title}</b>
                <p>{item.note}</p>
              </div>
              <a
                className="pn-btn pn-btn--sm"
                href={`${admin}${item.action.path}`}
                // Visible word first (WCAG 2.5.3), then what it is about.
                aria-label={`${item.action.label}: ${item.title}`}
              >
                {item.action.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function RecentCard({ data, admin }: { data: DashboardData; admin: string }) {
  return (
    <Card
      title="Ostatnie zapytania"
      actions={
        <a className="pn-link" href={`${admin}/zapytania`}>
          Wszystkie
        </a>
      }
    >
      {data.recent.length === 0 ? (
        // TODO(krystian): empty-state sentence.
        <EmptyState title="Jeszcze nie ma zapytań" />
      ) : (
        <ul className="pn-dash__list">
          {data.recent.map((r) => (
            <li key={r.number}>
              <a
                className="pn-recent"
                href={`${admin}/zapytania?nr=${encodeURIComponent(r.number)}`}
              >
                <span className="pn-av" aria-hidden="true">
                  {r.initials}
                </span>
                <span className="pn-recent__tx">
                  <span>
                    <b>{r.name}</b> <span className="pn-mu">· {r.topic}</span>
                  </span>
                  <small>{r.when}</small>
                </span>
                <Chip tone={STATUS_CHIP[r.status].tone}>{STATUS_CHIP[r.status].label}</Chip>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

const stageLabel = (stage: string) => ORDER_STAGE_CHOICES.find((c) => c.value === stage)?.label

function WorkshopCard({ workshop, href }: { workshop: WorkshopData; href: string }) {
  const n = workshop.inProgress
  return (
    <Card
      title="Warsztat"
      note={`${n} ${plural(n, ['komputer', 'komputery', 'komputerów'])} w realizacji`}
      className="pn-dash__workshop"
      actions={
        // TODO(P5): the workshop board `/zamowienia` — until then the Payload list of orders.
        <a className="pn-link" href={href}>
          Tablica
        </a>
      }
    >
      <ol className="pn-stages">
        {workshop.byStage.map((s) => (
          <li key={s.stage} className={s.count > 0 ? 'pn-stages__on' : undefined}>
            <span className="pn-stages__bar" aria-hidden="true" />
            <small>
              {stageLabel(s.stage)} · {s.count}
            </small>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function EventsCard({ data, now }: { data: DashboardData; now: Date }) {
  return (
    <Card title="Ostatnie zdarzenia">
      {data.events.length === 0 ? (
        // TODO(krystian): empty-state sentence.
        <EmptyState title="Jeszcze nic się nie wydarzyło" icon="bell" />
      ) : (
        <ul className="pn-dash__list">
          {data.events.map((e) => (
            <li key={e.key} className="pn-event">
              <span className="pn-event__ic">
                <Icon name={e.icon} size={16} />
              </span>
              <span className="pn-recent__tx">
                <span>{e.title}</span>
                <small>
                  {whenLabel(e.at, now)}
                  {e.by ? ` · ${e.by}` : ''}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
