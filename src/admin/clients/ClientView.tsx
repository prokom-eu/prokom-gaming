import type { AdminViewServerProps } from 'payload'

import { maskPhone, parseEntry, type TimelineKind } from '../../lib/clients'
import { plural } from '../../lib/pl'
import { zl } from '../../lib/pricing/format'
import { panelAccess } from '../access'
import { initials, whenLabel } from '../inquiries/format'
import { Card, Kpi } from '../ui/Card'
import { Chip, type Tone } from '../ui/Chip'
import { EmptyState } from '../ui/EmptyState'
import { Icon, type IconName } from '../ui/icons'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelShell } from '../ui/PanelShell'
import { ClientTabs, GdprActions, NoteForm, PhoneButton } from './ClientParts'
import styles from './clients.module.css'
import { emailOf, loadClientCard, type ClientCard } from './load'

const TITLE = 'Karta klienta'

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const day = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const shortDay = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: 'numeric',
  month: 'numeric',
})
const monthYear = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`
}

const ICON: Record<TimelineKind, IconName> = {
  inquiry: 'mail',
  reply: 'send',
  offer: 'send',
  order: 'box',
  ticket: 'inbox',
  unit: 'pencil',
}

// TODO(krystian): „woli kontakt e-mailowy” — the board shows only the phone.
const PREFERS = { phone: 'woli kontakt telefoniczny', email: 'woli kontakt e-mailowy' } as const

/**
 * /admin/klient?zapytanie=<id> | ?konto=<id> | ?zamowienie=<id> (panel spec §6, board Klient,
 * stany/tel-09-klient). Admin only. The entry is a record id; the server finds the e-mail and
 * gathers inquiries, orders, units, tickets and the account under it. „Wstecz” on the phone goes
 * to the list of clients.
 */
export async function ClientView({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied req={req} reason={access.reason} title={TITLE} path="/klient" active="clients" />
    )
  }
  const admin = req.payload.config.routes.admin
  const entry = parseEntry({
    zapytanie: one(searchParams?.zapytanie),
    konto: one(searchParams?.konto),
    zamowienie: one(searchParams?.zamowienie),
  })
  const email = entry ? await emailOf(req.payload, entry) : null
  const card = email ? await loadClientCard(req.payload, email) : null
  const back = { href: `${admin}/klienci`, label: 'Klienci' }

  if (!entry || !card) {
    return (
      <PanelShell req={req} title={TITLE} active="clients" crumbs={[back]} back={back}>
        {/* TODO(krystian): text — not on the board. */}
        <EmptyState title="Nie ma takiego klienta" icon="user">
          <a href={back.href}>Wróć do listy klientów</a>
        </EmptyState>
      </PanelShell>
    )
  }

  const now = new Date()
  const { tiles } = card
  const sub = [
    `Klient od ${day.format(new Date(card.since))}`,
    card.source,
    card.preferredContact ? PREFERS[card.preferredContact] : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <PanelShell
      req={req}
      title={card.name}
      active="clients"
      crumbs={[back, { label: card.name }]}
      back={back}
    >
      <header className={styles.head}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(card.name)}
        </span>
        <div className={styles.headText}>
          {card.paidOrders > 0 ? (
            <div className={styles.chips}>
              <Chip tone="ok">
                klient · {card.paidOrders}{' '}
                {plural(card.paidOrders, ['komputer', 'komputery', 'komputerów'])}
              </Chip>
            </div>
          ) : null}
          <h1 className={styles.name}>{card.name}</h1>
          <p className={styles.sub}>{sub}</p>
        </div>
        <div className={styles.headActions}>
          {card.writeTo ? (
            <a
              className="pn-btn"
              href={`${admin}/zapytania?nr=${encodeURIComponent(card.writeTo)}`}
            >
              <Icon name="mail" />
              Napisz
            </a>
          ) : null}
          {card.phone ? <PhoneButton phone={card.phone} masked={maskPhone(card.phone)} /> : null}
        </div>
      </header>

      <div className="pn-grid pn-g4">
        <Kpi
          label="Wydał łącznie"
          value={zl(tiles.spent)}
          note={`${tiles.orders} ${plural(tiles.orders, ['zamówienie', 'zamówienia', 'zamówień'])}`}
        />
        <Kpi
          label="Zapytania"
          value={String(tiles.inquiries)}
          note={tiles.firstReply ? `odpowiedź po ${tiles.firstReply}` : undefined}
        />
        <Kpi
          label="Komputer w warsztacie"
          value={tiles.workshop?.stage ?? '—'}
          tone={tiles.workshop ? 'gold' : undefined}
          note={
            tiles.workshop
              ? [
                  tiles.workshop.build,
                  tiles.workshop.due
                    ? `wysyłka do ${shortDay.format(new Date(tiles.workshop.due))}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : undefined
          }
        />
        <Kpi
          label="Gwarancja"
          value={tiles.warranty ? `do ${monthYear(tiles.warranty.until)}` : '—'}
          note={
            tiles.warranty
              ? [
                  tiles.warranty.build,
                  tiles.warranty.number ? `egzemplarz nr ${tiles.warranty.number}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : undefined
          }
        />
      </div>

      <div className={styles.layout}>
        <section className={`pn-card ${styles.main}`} aria-label="Historia klienta">
          <ClientTabs
            tabs={[
              { label: 'Oś czasu', content: <Timeline card={card} now={now} /> },
              {
                label: 'Zapytania i zamówienia',
                content: <Records card={card} admin={admin} now={now} />,
              },
              { label: 'Komputer i gwarancja', content: <Units card={card} /> },
              { label: 'Zgłoszenia', content: <Tickets card={card} now={now} /> },
              {
                label: 'Zgody i RODO',
                content: (
                  <>
                    <Consents card={card} />
                    <GdprActions entry={entry} admin={admin} />
                  </>
                ),
              },
            ]}
          />
        </section>
        <aside className={styles.side} aria-label="Dane klienta">
          <Card title="Dane kontaktowe">
            <dl className="pn-kv">
              <dt>E-mail</dt>
              <dd className={styles.selectable}>{card.email}</dd>
              <dt>Telefon</dt>
              <dd>{card.phone ? maskPhone(card.phone) : '—'}</dd>
              <dt>Odbiór</dt>
              <dd>{card.pickup ?? '—'}</dd>
              <dt>Faktura</dt>
              <dd>{card.invoice ?? '—'}</dd>
            </dl>
          </Card>
          {card.notes ? (
            <Card title="Notatki">
              {card.notes.target === 'inquiry'
                ? card.notes.list.map((n) => (
                    <div key={n.at} className={styles.note}>
                      <b>{n.author ?? 'panel'}</b> <small>{whenLabel(n.at, now)}</small>
                      <p>{n.body}</p>
                    </div>
                  ))
                : null}
              <NoteForm
                entry={entry}
                target={card.notes.target}
                id={card.notes.id}
                initial={card.notes.target === 'account' ? card.notes.text : ''}
              />
            </Card>
          ) : null}
          {card.fromInquiry ? (
            <Card title="Z zapytania">
              <dl className="pn-kv">
                <dt>Gry</dt>
                <dd>{card.fromInquiry.games ?? '—'}</dd>
                <dt>Monitor</dt>
                <dd>{card.fromInquiry.monitor ?? '—'}</dd>
                <dt>Skąd przyszedł</dt>
                <dd>{card.fromInquiry.source ?? '—'}</dd>
              </dl>
            </Card>
          ) : null}
        </aside>
      </div>
    </PanelShell>
  )
}

function Timeline({ card, now }: { card: ClientCard; now: Date }) {
  if (card.timeline.length === 0) return <p className={styles.mu}>Brak zdarzeń.</p>
  return (
    <ol className={styles.feed}>
      {card.timeline.map((e, i) => (
        <li key={`${e.at}-${i}`} className={styles.event}>
          <span className={styles.eventIcon}>
            <Icon name={ICON[e.kind]} size={16} />
          </span>
          <div>
            <p>
              <b>{e.lead}</b> {e.text}
            </p>
            <small className={styles.mu}>
              {whenLabel(e.at, now)}
              {e.by ? ` · ${e.by}` : ''}
            </small>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Records({ card, admin, now }: { card: ClientCard; admin: string; now: Date }) {
  if (card.inquiries.length === 0 && card.orders.length === 0) {
    return <p className={styles.mu}>Brak zapytań i zamówień.</p>
  }
  return (
    <ul className={styles.list}>
      {card.orders.map((o) => (
        <li key={`o${o.id}`} className={styles.item}>
          <a href={`${admin}/zamowienia?z=${o.id}`}>
            <b>Zamówienie {o.number}</b>
          </a>
          <span>
            {[o.build, o.stage, o.price !== null ? zl(o.price) : null].filter(Boolean).join(' · ')}
          </span>
          <small className={styles.mu}>{whenLabel(o.at, now)}</small>
        </li>
      ))}
      {card.inquiries.map((i) => (
        <li key={`i${i.id}`} className={styles.item}>
          <a href={`${admin}/zapytania?nr=${encodeURIComponent(i.number)}`}>
            <b>Zapytanie {i.number}</b>
          </a>
          <span>
            {i.topic} <Chip tone={i.status.tone as Tone}>{i.status.label}</Chip>
          </span>
          <small className={styles.mu}>{whenLabel(i.at, now)}</small>
        </li>
      ))}
    </ul>
  )
}

function Units({ card }: { card: ClientCard }) {
  if (card.units.length === 0) return <p className={styles.mu}>Brak egzemplarza.</p>
  return (
    <>
      {card.units.map((u) => (
        <div key={u.code} className={styles.unit}>
          <p>
            <b>{u.build ?? 'Komputer'}</b>
            {u.number ? ` · egzemplarz nr ${u.number}` : ''}
            {u.warrantyUntil ? ` · gwarancja do ${day.format(new Date(u.warrantyUntil))}` : ''}
          </p>
          <p className={styles.mu}>
            {u.published ? (
              <a href={`/metryka/${u.code}`} target="_blank" rel="noopener">
                metryka {u.code}
              </a>
            ) : (
              `metryka ${u.code} w przygotowaniu`
            )}
          </p>
          {u.parts.length ? (
            <dl className="pn-kv">
              {u.parts.map((p, i) => (
                <div key={`${p.label}-${i}`} className={styles.part}>
                  <dt>{p.label}</dt>
                  <dd>
                    {p.model || '—'}
                    {p.serial ? <small className={styles.mu}> · nr {p.serial}</small> : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ))}
    </>
  )
}

function Tickets({ card, now }: { card: ClientCard; now: Date }) {
  if (card.tickets.length === 0) {
    return (
      <>
        <p>Brak zgłoszeń.</p>
        <p className={styles.mu}>
          Gdy klient zgłosi problem w swoim koncie (gra się zacina, nie włącza się, głośno),
          zgłoszenie pojawi się tutaj z numerem egzemplarza i zgodą na pomoc zdalną.
        </p>
      </>
    )
  }
  return (
    <ul className={styles.list}>
      {card.tickets.map((t, i) => (
        <li key={`${t.at}-${i}`} className={styles.item}>
          <b>{t.category}</b>
          <span>
            {t.status} · {t.description.slice(0, 160)}
          </span>
          <small className={styles.mu}>{whenLabel(t.at, now)}</small>
        </li>
      ))}
    </ul>
  )
}

function Consents({ card }: { card: ClientCard }) {
  return (
    <dl className="pn-kv">
      {card.consents.map((c, i) => (
        <div key={`${c.at}-${i}`} className={styles.part}>
          <dt>{c.what}</dt>
          <dd>
            zaakceptowane {day.format(new Date(c.at))}
            {c.version ? `, wersja ${c.version}` : ''}
          </dd>
        </div>
      ))}
      <div className={styles.part}>
        <dt>Dane przechowujemy</dt>
        <dd>
          {card.hasOrders
            ? 'wg przepisów podatkowych (zamówienie)'
            : 'Zapytania bez zamówienia usuwamy automatycznie po 24 miesiącach od ostatniego kontaktu.'}
        </dd>
      </div>
    </dl>
  )
}
