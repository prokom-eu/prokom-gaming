'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'

import { zl } from '../../lib/pricing/format'
import { Icon } from '../ui/icons'
import { moveStage, saveWorkshopNote, setChecklistItem } from './actions'
import type { BoardCard, BoardData } from './load'
import styles from './orders.module.css'

type Props = {
  columns: BoardData['columns']
  firstId: number | null
  stageEmail: boolean
  admin: string
  /** `serwis` has no client card (spec §15). */
  canSeeClient: boolean
}

// TODO(krystian): texts outside the board — empty column (other than „Oferta przyjęta”), results.
const EMPTY_COLUMN: Record<string, string> = {
  offer: 'Tu trafiają oferty przyjęte przez klienta, zanim wpłaci.',
}
const MAIL_RESULT = {
  sent: 'Przesunięte. Klient dostał e-mail z nowym etapem.',
  off: 'Przesunięte. E-mail do klienta jest wyłączony w ustawieniach.',
  none: 'Przesunięte.',
  failed: 'Przesunięte, ale e-mail do klienta nie wyszedł — napisz do klienta ręcznie.',
} as const

function Sigil({ card }: { card: BoardCard }) {
  if (!card.build) return null
  return (
    <span
      className="pn-sigil"
      aria-hidden="true"
      style={{
        ['--sigil' as string]: `url(/sigils/${card.build.key}-plain.svg)`,
        color: `var(--c-${card.build.slug}, var(--p-gold))`,
      }}
    />
  )
}

/**
 * The workshop board (board Zamowienia): 7 columns of order cards, then the panel of the chosen
 * order. On the phone the columns are swiped with a finger (scroll-snap, ~85% wide, the edge of
 * the next one visible — spec §2a pt 5) and the panel sits under them (stany/tel-07).
 */
export function OrdersBoard({ columns, firstId, stageEmail, admin, canSeeClient }: Props) {
  const all = columns.flatMap((c) => c.cards)
  const [selectedId, setSelectedId] = useState(firstId)
  const selected = all.find((c) => c.id === selectedId) ?? all[0] ?? null

  return (
    <>
      <div className={styles.board}>
        {columns.map((col) => (
          <section key={col.stage} className={styles.col} aria-label={col.label}>
            <h2 className={styles.colHead}>
              {col.label}
              <span className={styles.count}>{col.cards.length}</span>
            </h2>
            {col.cards.length === 0 ? (
              <p className={styles.empty}>{EMPTY_COLUMN[col.stage] ?? 'Pusto.'}</p>
            ) : (
              <ul className={styles.cards}>
                {col.cards.map((card) => (
                  <li key={card.id}>
                    <button
                      type="button"
                      className={styles.card}
                      aria-pressed={card.id === selected?.id}
                      onClick={() => setSelectedId(card.id)}
                    >
                      <span className={styles.cardName}>
                        <Sigil card={card} />
                        <b>{card.build?.name ?? 'Własna konfiguracja'}</b>
                      </span>
                      <span className={styles.mu}>{card.number}</span>
                      <span>
                        {card.name}
                        {card.price !== null ? (
                          <>
                            {' · '}
                            <span className={styles.nowrap}>{zl(card.price)}</span>
                          </>
                        ) : null}
                      </span>
                      <span className={styles.chips}>
                        {card.due ? <span className={styles.chip}>termin {card.due}</span> : null}
                        {card.inStage ? (
                          <span className={styles.chip}>w etapie: {card.inStage}</span>
                        ) : null}
                      </span>
                      {card.note ? <span className={styles.note}>{card.note}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {selected ? (
        <OrderPanel
          key={selected.id}
          card={selected}
          stageEmail={stageEmail}
          admin={admin}
          canSeeClient={canSeeClient}
        />
      ) : null}
    </>
  )
}

function OrderPanel({
  card,
  stageEmail,
  admin,
  canSeeClient,
}: {
  card: BoardCard
  stageEmail: boolean
  admin: string
  canSeeClient: boolean
}) {
  const router = useRouter()
  const noteId = useId()
  const [checks, setChecks] = useState(card.checklist)
  const [note, setNote] = useState(card.note ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const tick = (key: string, done: boolean) => {
    setChecks((list) => list.map((c) => (c.key === key ? { ...c, done } : c)))
    setMessage(null)
    start(async () => {
      const result = await setChecklistItem({ orderId: card.id, key, done })
      if (!result.ok) {
        setChecks((list) => list.map((c) => (c.key === key ? { ...c, done: !done } : c)))
        setMessage(result.message)
      }
    })
  }

  const move = () => {
    setMessage(null)
    start(async () => {
      const result = await moveStage({ orderId: card.id, from: card.stage })
      setMessage(result.ok ? MAIL_RESULT[result.mail] : result.message)
      if (result.ok) router.refresh()
    })
  }

  const save = () => {
    setMessage(null)
    start(async () => {
      const result = await saveWorkshopNote({ orderId: card.id, note })
      // TODO(krystian): text — not on the board.
      setMessage(result.ok ? 'Notatka zapisana.' : result.message)
      if (result.ok) router.refresh()
    })
  }

  return (
    <section className={`pn-card ${styles.panel}`} aria-label={`Zamówienie ${card.number}`}>
      <div className={styles.panelMain}>
        <div className={styles.panelHead}>
          <Sigil card={card} />
          <div>
            <h2 className={styles.panelName}>{card.build?.name ?? 'Własna konfiguracja'}</h2>
            <small className={styles.mu}>
              {card.number} · {card.name}
              {card.price !== null ? ` · ${zl(card.price)}` : ''}
            </small>
          </div>
        </div>
        <dl className={styles.kv}>
          <dt>Etap</dt>
          <dd>{card.stageText}</dd>
          <dt>Termin</dt>
          <dd>{card.due ?? '—'}</dd>
          <dt>Na tablicy na stronie</dt>
          <dd>{card.strip ? `„${card.strip}”` : '—'}</dd>
        </dl>
        <label className={styles.noteLabel} htmlFor={noteId}>
          Notatka warsztatu
        </label>
        <textarea
          id={noteId}
          className={styles.noteField}
          value={note}
          maxLength={2000}
          rows={2}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        {note !== (card.note ?? '') ? (
          <button type="button" className="pn-btn" onClick={save} disabled={pending}>
            Zapisz notatkę
          </button>
        ) : null}
      </div>
      <div className={styles.panelSide}>
        <h3 className={styles.checkHead}>Lista kontrolna serwisu</h3>
        <ul className={styles.checks}>
          {checks.map((c) => (
            <li key={c.key}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={c.done}
                  disabled={pending}
                  onChange={(e) => tick(c.key, e.currentTarget.checked)}
                />
                <span>{c.label}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          {canSeeClient ? (
            <a className="pn-btn" href={`${admin}/klient?zamowienie=${card.id}`}>
              <Icon name="user" />
              Klient
            </a>
          ) : null}
          {card.unitCode ? (
            <a className="pn-btn" href={`/metryka/${card.unitCode}`} target="_blank" rel="noopener">
              <Icon name="qr" />
              Metryka
            </a>
          ) : (
            <a className="pn-btn" href={`${admin}/collections/units/create`}>
              <Icon name="qr" />
              Metryka
            </a>
          )}
          {card.next ? (
            <button
              type="button"
              className={`pn-btn pn-btn--gold ${styles.move}`}
              onClick={move}
              disabled={pending}
            >
              <Icon name="next" />
              Przesuń do: {card.next.label}
            </button>
          ) : null}
        </div>
        <p className={styles.mu} role="status" aria-live="polite">
          {message ??
            (card.next?.mails && stageEmail
              ? 'Po przesunięciu klient dostaje e-mail z nowym etapem (można wyłączyć w ustawieniach).'
              : '')}
        </p>
        {/* The board only moves forward; a mistake is corrected in the order form. */}
        <a className={styles.fix} href={`${admin}/collections/orders/${card.id}`}>
          Popraw w formularzu zamówienia
        </a>
      </div>
    </section>
  )
}
