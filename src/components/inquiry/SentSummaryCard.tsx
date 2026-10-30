'use client'

import { useMemo, useSyncExternalStore } from 'react'

import { Sigil } from '@/components/Sigil'
import { ButtonLink } from '@/components/ui/Button'
import { readSent } from '@/lib/inquiry/sent'
import { routes } from '@/lib/nav'

// `sessionStorage` does not change while the page is open: nothing to subscribe to.
const noSubscribe = () => () => {}

/**
 * „Twoja konfiguracja” after sending (board Zapytanie `.qsum`), from this tab's `sessionStorage`.
 * Opened in another tab (or with storage blocked) the card shows only the contact line and the
 * button — the number above is what matters.
 */
export function SentSummaryCard({
  number,
  phone,
  phoneHref,
}: {
  number: string
  phone: string
  phoneHref: string
}) {
  // A string snapshot (stable between renders); the server and hydration render without it.
  const raw = useSyncExternalStore(
    noSubscribe,
    () => JSON.stringify(readSent(number)),
    () => 'null',
  )
  const summary = useMemo(() => JSON.parse(raw) as ReturnType<typeof readSent>, [raw])

  return (
    <div className="iq-card">
      {summary && (
        <>
          <h2 className="h iq-card__h">Twoja konfiguracja</h2>
          <div className="iq-card__p">
            {summary.key && (
              <span className="iq-card__sg" style={{ color: `var(--c-${summary.key})` }}>
                <Sigil id={summary.key} size={64} />
              </span>
            )}
            <span>
              <strong className="iq-card__t">{summary.title}</strong>
              <small>{summary.sub}</small>
            </span>
          </div>
          <dl className="iq-card__rows">
            {summary.rows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <p className="iq-card__note">
        Coś się nie zgadza? Odpisz na maila z potwierdzeniem albo zadzwoń:{' '}
        <a href={phoneHref}>{phone}</a>.
      </p>
      <div className="iq-card__a">
        <ButtonLink href={routes.home}>Wróć na stronę główną</ButtonLink>
        {/* TODO(G14): „Załóż konto i śledź zamówienie” (board) once the customer account exists. */}
      </div>
    </div>
  )
}
