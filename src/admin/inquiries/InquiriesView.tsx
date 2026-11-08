import type { AdminViewServerProps } from 'payload'

import { getEnv } from '../../lib/env'
import type { User } from '../../payload-types'
import { panelAccess } from '../access'
import { Chip } from '../ui/Chip'
import { EmptyState } from '../ui/EmptyState'
import { FilterPill } from '../ui/FilterPill'
import { Icon } from '../ui/icons'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { numberIn } from '../../lib/mail/match'
import {
  INBOX_FILTERS,
  STATUS_CHIP,
  UNMATCHED_FILTER,
  parseFilter,
  type InboxFilter,
} from './format'
import { AsideActions, InboxSearch, ReplyBox, StatusSwitch } from './InboxClient'
import { attachmentsLine, loadInbox, type InboxData, type InboxRow, type InboxThread } from './load'
import { UnmatchedActions } from './UnmatchedClient'

const TITLE = 'Zapytania'

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * /admin/zapytania (panel spec §4, board Zapytania, ADR-G008). Admin only — `serwis` gets "403"
 * (spec §15). Computer: three columns (list · thread · client and configuration). Phone: the
 * list and the thread are two screens — `?nr=` opens the thread full screen with the reply box
 * stuck to the bottom; back returns to the list with its filter (spec §2a pt 7). Without `?nr=`
 * the computer shows the first inquiry, the phone the list.
 */
export async function InquiriesView({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title={TITLE}
        path="/zapytania"
        active="inquiries"
      />
    )
  }

  const filter = parseFilter(one(searchParams?.filtr))
  const asked = one(searchParams?.nr)?.trim() || null
  // „Nieprzypisane”: the message by its record id only — never an address in the URL.
  const wiad = Number(one(searchParams?.wiad))
  const unmatchedId = Number.isInteger(wiad) && wiad > 0 ? wiad : null
  const fromAddress = getEnv().MAIL_FROM_ADDRESS
  const data = await loadInbox(req.payload, req.user as User, {
    filter,
    nr: asked,
    unmatchedId,
    fromAddress,
  })
  const { thread, unmatched } = data
  const mode = unmatched
    ? !unmatched.open
      ? 'none'
      : unmatchedId === null
        ? 'auto'
        : 'open'
    : !thread
      ? 'none'
      : data.auto
        ? 'auto'
        : 'open'

  const admin = req.payload.config.routes.admin
  const listHref = (f: InboxFilter) => `${admin}/zapytania${f === 'wszystkie' ? '' : `?filtr=${f}`}`
  const rowHref = (row: InboxRow) => {
    const q = new URLSearchParams(filter === 'wszystkie' ? {} : { filtr: filter })
    q.set('nr', row.number)
    return `${admin}/zapytania?${q.toString()}`
  }
  const unmatchedHref = (id: number) => `${admin}/zapytania?filtr=${UNMATCHED_FILTER}&wiad=${id}`
  const { from, to } = data.replyHours

  return (
    <PanelShell req={req} title={TITLE} active="inquiries" crumbs={[{ label: 'Codziennie' }]}>
      <PanelPage
        title={TITLE}
        lead="Wszystko, co klienci wysłali ze strony. Odpowiadasz stąd, klient dostaje zwykły e-mail ze skrzynki Gaming, a jego odpowiedź wraca do tego wątku."
        actions={
          <span className="pn-live pn-d-only">
            <span className="pn-dot pn-dot--warn" aria-hidden="true" />
            Obietnica na stronie: odpowiedź w godzinę, {from}–{to}
          </span>
        }
      />
      {data.missing || unmatched?.missing ? (
        // TODO(krystian): text — not on the board.
        <p className="pn-formstatus" role="status">
          {unmatched
            ? 'Tej wiadomości już nie ma albo została obsłużona.'
            : 'Nie ma zapytania o tym numerze — mogło zostać usunięte.'}
        </p>
      ) : null}

      <div className="pn-ibx" data-thread={mode}>
        <section className="pn-ibl" aria-label="Lista zapytań">
          <div className="pn-ibl__hd">
            <InboxSearch filter={filter === 'wszystkie' ? null : filter} />
            <nav className="pn-pills" aria-label="Filtr zapytań">
              {INBOX_FILTERS.map((f) => (
                <FilterPill
                  key={f.value}
                  label={f.label}
                  count={data.counts[f.value]}
                  active={f.value === filter}
                  href={listHref(f.value)}
                />
              ))}
              {data.unmatchedCount > 0 || unmatched ? (
                <FilterPill
                  label="Nieprzypisane"
                  count={data.unmatchedCount}
                  active={Boolean(unmatched)}
                  href={listHref(UNMATCHED_FILTER)}
                />
              ) : null}
            </nav>
          </div>
          {unmatched ? (
            <UnmatchedList
              data={unmatched}
              openId={unmatched.open?.id ?? null}
              href={unmatchedHref}
            />
          ) : data.rows.length === 0 ? (
            // TODO(krystian): text — not on the board.
            <EmptyState title="Brak zapytań w tym filtrze." />
          ) : (
            <ul className="pn-ibl__list">
              {data.rows.map((row) => (
                <li key={row.id}>
                  <a
                    className="pn-it"
                    href={rowHref(row)}
                    aria-current={thread?.id === row.id ? 'true' : undefined}
                  >
                    <span className="pn-av" aria-hidden="true">
                      {row.initials}
                    </span>
                    <span className="pn-it__b">
                      <span className="pn-it__top">
                        <b>{row.name}</b>
                        {row.status === 'new' || row.unread > 0 ? (
                          <span className="pn-it__new">
                            <span className="pn-sr">
                              {row.unread > 0 ? ', nowa wiadomość' : ', nowe'}
                            </span>
                          </span>
                        ) : null}
                        <time>{row.when}</time>
                      </span>
                      <span className="pn-it__msg">
                        <b>{row.topic}</b>
                        {row.preview ? ` · ${row.preview}` : null}
                      </span>
                      <span className="pn-it__meta">
                        <Chip tone={STATUS_CHIP[row.status].tone}>
                          {STATUS_CHIP[row.status].label}
                        </Chip>
                        <span className="pn-it__type">{row.typeLabel}</span>
                        {row.unread > 0 ? (
                          // TODO(krystian): label „nowa wiadomość” — ADR-G008 pt 5, not on the board.
                          <span className="pn-it__wait pn-it__wait--warn">
                            {row.unread === 1 ? 'nowa wiadomość' : `nowe wiadomości: ${row.unread}`}
                          </span>
                        ) : (
                          <span className={`pn-it__wait pn-it__wait--${row.meta.tone}`}>
                            {row.meta.text}
                          </span>
                        )}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {unmatched ? (
          unmatched.open ? (
            <UnmatchedMessage
              message={unmatched.open}
              backHref={listHref(UNMATCHED_FILTER)}
              threadHref={`${admin}/zapytania?nr=`}
            />
          ) : (
            <section className="pn-ibm" aria-label="Wiadomość">
              {/* TODO(krystian): text — not on the board. */}
              <EmptyState title="Nic do przypisania." />
            </section>
          )
        ) : thread ? (
          <Thread thread={thread} backHref={listHref(filter)} />
        ) : (
          <section className="pn-ibm" aria-label="Wątek">
            {/* TODO(krystian): text — not on the board. */}
            <EmptyState title="Wybierz zapytanie z listy." />
          </section>
        )}
      </div>
    </PanelShell>
  )
}

function Thread({ thread, backHref }: { thread: InboxThread; backHref: string }) {
  const canClose = thread.status !== 'lost' && thread.status !== 'closed' && thread.status !== 'won'
  return (
    <>
      <section className="pn-ibm" aria-labelledby="pn-thread-title">
        <header className="pn-ibm__hd">
          <a className="pn-icb pn-ibm__back" href={backHref} aria-label="Wróć do listy zapytań">
            <Icon name="back" size={20} />
          </a>
          <div className="pn-ibm__tt">
            <h2 id="pn-thread-title">{thread.topic}</h2>
            <p>
              {thread.number} · {thread.typeLabel} · {thread.when}
            </p>
          </div>
          <StatusSwitch inquiryId={thread.id} status={thread.status} />
        </header>

        <ol className="pn-msgs" aria-label="Wiadomości">
          {thread.messages.map((m) => (
            <li key={m.id} className={`pn-msg pn-msg--${m.kind}`}>
              {m.kind === 'system' ? null : (
                <span className="pn-msg__h">
                  <b>
                    {m.kind === 'note' ? 'Notatka wewnętrzna' : m.who}
                    {m.kind === 'note' && m.who ? ` · ${m.who}` : null}
                    {m.kind === 'out' ? <span className="pn-sr"> (wysłana odpowiedź)</span> : null}
                  </b>
                  {m.when}
                </span>
              )}
              {m.kind === 'system' ? <span className="pn-msg__h">{m.when}</span> : null}
              <p>{m.body}</p>
            </li>
          ))}
        </ol>

        <ReplyBox
          key={thread.id}
          inquiryId={thread.id}
          templates={thread.templates}
          from={thread.from}
          toMasked={thread.toMasked}
          priceChanged={thread.priceChanged}
        />
      </section>

      <aside className="pn-ibc" aria-label="Klient i konfiguracja">
        <div className="pn-ibc__who">
          <span className="pn-av pn-av--lg" aria-hidden="true">
            {thread.client.initials}
          </span>
          <div>
            <b>{thread.client.name}</b>
            {thread.client.prefers ? <p>woli kontakt: {thread.client.prefers}</p> : null}
          </div>
        </div>
        <dl className="pn-kv">
          {thread.client.rows.map((r) => (
            <Row key={r.label} label={r.label} value={r.value} href={r.href} />
          ))}
        </dl>

        {thread.computer ? (
          <div className="pn-ibc__sec">
            <h3>
              Konfiguracja <small>tak widział ją klient</small>
            </h3>
            <dl className="pn-kv">
              {thread.computer.rows.map((r) => (
                <Row key={r.label} label={r.label} value={r.value} />
              ))}
            </dl>
            <dl className="pn-kv pn-kv--sum">
              <Row label="Cena przy zapytaniu" value={thread.computer.priceAt ?? '—'} />
              <Row label="Cena dziś" value={thread.computer.priceToday ?? '—'} />
              {thread.computer.margin ? (
                <>
                  <dt>Marża (tylko panel)</dt>
                  <dd>
                    <Chip tone={thread.computer.margin.tone}>{thread.computer.margin.text}</Chip>
                  </dd>
                </>
              ) : null}
            </dl>
          </div>
        ) : null}

        {thread.extra.length > 0 ? (
          <dl className="pn-kv pn-ibc__sec">
            {thread.extra.map((r) => (
              <Row key={r.label} label={r.label} value={r.value} />
            ))}
          </dl>
        ) : null}

        {thread.order ? (
          <p className="pn-ibc__order">
            <Icon name="box" size={17} /> Zamówienie {thread.order.number}
          </p>
        ) : null}
        <AsideActions inquiryId={thread.id} canConvert={thread.canConvert} canClose={canClose} />
      </aside>
    </>
  )
}

function UnmatchedList({
  data,
  openId,
  href,
}: {
  data: NonNullable<InboxData['unmatched']>
  openId: number | null
  href: (id: number) => string
}) {
  if (data.rows.length === 0) {
    // TODO(krystian): text — not on the board.
    return <EmptyState title="Nic do przypisania." />
  }
  return (
    <ul className="pn-ibl__list">
      {data.rows.map((row) => (
        <li key={row.id}>
          <a
            className="pn-it"
            href={href(row.id)}
            aria-current={openId === row.id ? 'true' : undefined}
          >
            <span className="pn-av" aria-hidden="true">
              <Icon name="mail" size={17} />
            </span>
            <span className="pn-it__b">
              <span className="pn-it__top">
                <b>{row.from}</b>
                <time>{row.when}</time>
              </span>
              <span className="pn-it__msg">
                <b>{row.subject}</b>
                {row.preview ? ` · ${row.preview}` : null}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function UnmatchedMessage({
  message,
  backHref,
  threadHref,
}: {
  message: NonNullable<NonNullable<InboxData['unmatched']>['open']>
  backHref: string
  threadHref: string
}) {
  return (
    <>
      <section className="pn-ibm" aria-labelledby="pn-thread-title">
        <header className="pn-ibm__hd">
          <a className="pn-icb pn-ibm__back" href={backHref} aria-label="Wróć do listy wiadomości">
            <Icon name="back" size={20} />
          </a>
          <div className="pn-ibm__tt">
            <h2 id="pn-thread-title">{message.subject}</h2>
            <p>
              {message.from} · {message.when}
            </p>
          </div>
        </header>
        <ol className="pn-msgs" aria-label="Wiadomość">
          <li className="pn-msg pn-msg--in">
            <span className="pn-msg__h">
              <b>{message.from}</b>
              {message.when}
            </span>
            <p>
              {message.attachments
                ? `${message.body}\n\n${attachmentsLine(message.attachments)}`
                : message.body}
            </p>
          </li>
        </ol>
        <UnmatchedActions
          key={message.id}
          id={message.id}
          suggested={numberIn(message.subject)}
          threadHref={threadHref}
          listHref={backHref}
        />
      </section>
      <aside className="pn-ibc" aria-label="Jak przypisać">
        {/* TODO(krystian): text — not on the board (ADR-G008 pt 3, 7). */}
        <div className="pn-ibc__sec">
          <h3>Nieprzypisana wiadomość</h3>
          <p className="pn-ibc__hint">
            Przyszła na skrzynkę Gaming, ale nie ma numeru zapytania w temacie ani nie odpowiada na
            naszą wiadomość. Przypnij ją do zapytania po numerze — trafi do wątku jako odpowiedź
            klienta. Odrzucona nie wraca; wiadomości stąd znikają po 90 dniach (w poczcie zostają).
          </p>
        </div>
      </aside>
    </>
  )
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{href ? <a href={href}>{value}</a> : value}</dd>
    </>
  )
}
