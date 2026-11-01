'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import type { ItemRow } from '../../lib/price-check/diff'
import { zl } from '../../lib/pricing/format'
import { Alert } from '../ui/Alert'
import { Card } from '../ui/Card'
import { Chip, type Tone } from '../ui/Chip'
import { DataTable, type Column } from '../ui/DataTable'
import { FilterPill } from '../ui/FilterPill'
import { Icon } from '../ui/icons'
import { acceptCheck } from './actions'
import styles from './reports.module.css'

/** A check in progress: its step and a bar; the page refreshes every few seconds. */
export function Progress({ step, value }: { step: string; value: number }) {
  const router = useRouter()
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(timer)
  }, [router])
  return (
    <Card title="Sprawdzanie w toku">
      <p className={styles.mu} role="status">
        {step} · {value}%
      </p>
      <div
        className={styles.bar}
        role="progressbar"
        aria-label="Postęp sprawdzania"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
      {/* TODO(krystian): sentence not on the board. */}
      <p className={styles.mu}>Możesz zamknąć tę stronę — raport zapisze się sam.</p>
    </Card>
  )
}

/** „Przyjmij N propozycji”: costs only (like the CSV import); prices wait for approval. */
export function AcceptButton({
  checkId,
  count,
  accepted,
  approveHref,
}: {
  checkId: number
  count: number
  accepted: boolean
  approveHref: string
}) {
  const router = useRouter()
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const label = `Przyjmij ${count} ${count === 1 ? 'propozycję' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'propozycje' : 'propozycji'}`
  if (accepted || result) {
    return (
      <span className={styles.accepted} role="status">
        {/* TODO(krystian): messages not on the board. */}
        <Chip tone="ok">{result ?? 'propozycje przyjęte'}</Chip>
        <a className="pn-link" href={approveHref}>
          Do zatwierdzenia
        </a>
      </span>
    )
  }
  return (
    <span className={styles.acceptWrap}>
      <button
        type="button"
        className="pn-btn pn-btn--gold"
        disabled={count === 0 || pending}
        onClick={() =>
          start(async () => {
            try {
              const outcome = await acceptCheck({ checkId })
              if (outcome.ok) {
                setResult(`zapisano koszty: ${outcome.options} opcji, ${outcome.levels} poziomów`)
                router.refresh()
              } else setError(outcome.message)
            } catch {
              setError('Nie udało się wysłać — sprawdź połączenie.')
            }
          })
        }
      >
        <Icon name="check" />
        {pending ? 'Zapisuję…' : label}
      </button>
      {error ? <Alert title="Nie przyjęto">{error}</Alert> : null}
    </span>
  )
}

type Filter = 'all' | 'propose' | 'manual' | 'unavailable' | 'nooffer'

const CATEGORY: Record<ItemRow['category'], string> = {
  case: 'Obudowa',
  cooler: 'Chłodzenie',
  ram: 'RAM',
  ssd: 'Dysk',
  cpu: 'Procesor',
  gpu: 'Karta',
  mobo: 'Płyta',
  psu: 'Zasilacz',
}

const STATUS: Record<ItemRow['decision']['kind'], { tone: Tone; label: string }> = {
  propose: { tone: 'gold', label: 'do zatwierdzenia' },
  same: { tone: 'ok', label: 'bez zmian' },
  manual: { tone: 'warn', label: 'do ręcznego sprawdzenia' },
  invoice: { tone: 'info', label: 'koszt z faktury' },
  unavailable: { tone: 'bad', label: 'niedostępne' },
  nooffer: { tone: 'mu', label: 'brak oferty' },
}

const pct = (v: number) => {
  const text = `${(v * 100).toFixed(1).replace('.', ',').replace('-', '−')}%`
  return v > 0 ? `+${text}` : text
}

/** „Zmiany cen części” (board Raport): filters, offers with links, status. */
export function ItemsTable({ items }: { items: ItemRow[] }) {
  const changed = items.filter((i) => i.decision.kind !== 'same')
  // „Wszystkie” = what was read; items with nothing to read sit under „Brak oferty” only (before
  // the links are added that is most of the offer).
  const matches = (i: ItemRow, f: Filter) =>
    f === 'all' ? i.decision.kind !== 'nooffer' : i.decision.kind === f
  const [filter, setFilter] = useState<Filter>(() =>
    changed.some((i) => i.decision.kind === 'propose') ? 'propose' : 'all',
  )
  const shown = changed.filter((i) => matches(i, filter))
  const count = (f: Filter) => changed.filter((i) => matches(i, f)).length

  const columns: Column<ItemRow>[] = [
    {
      key: 'item',
      label: 'Pozycja',
      render: (i) => (
        <span className={styles.item}>
          <b>{i.title}</b>
          <small>{i.model}</small>
        </span>
      ),
    },
    { key: 'kind', label: 'Rodzaj', render: (i) => CATEGORY[i.category] },
    { key: 'cost', label: 'Koszt teraz', align: 'right', render: (i) => zl(i.cost) },
    { key: 'market', label: 'Dziś', align: 'right', render: (i) => <b>{zl(i.market)}</b> },
    {
      key: 'change',
      label: 'Zmiana',
      align: 'right',
      render: (i) =>
        'change' in i.decision && Number.isFinite(i.decision.change) ? (
          <span className={i.decision.change > 0 ? styles.up : styles.down}>
            {pct(i.decision.change)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'price',
      label: 'Cena na stronie',
      align: 'right',
      render: (i) =>
        i.priceNow === null
          ? i.levels.length > 0
            ? `w poziomach ${i.levels.join(', ')}`
            : '—'
          : i.priceNew !== null && i.priceNew !== i.priceNow
            ? `${zl(i.priceNow)} → ${zl(i.priceNew)}`
            : zl(i.priceNow),
    },
    {
      key: 'builds',
      label: 'W zestawach',
      render: (i) => (
        <span className={styles.mu}>
          {i.builds.length > 0 ? i.builds.join(', ') : 'tylko w konfiguratorze'}
        </span>
      ),
    },
    {
      key: 'offers',
      label: 'Źródła',
      render: (i) =>
        i.offers.length === 0 ? (
          <span className={styles.mu}>brak linków</span>
        ) : (
          <details className={styles.offers}>
            <summary>
              {i.offers.length}{' '}
              {i.offers.length === 1 ? 'oferta' : i.offers.length < 5 ? 'oferty' : 'ofert'}
            </summary>
            <ul>
              {i.offers.map((o) => (
                <li key={o.url}>
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="pn-link"
                  >
                    {o.shop || 'sklep'}
                  </a>{' '}
                  {o.price !== null ? zl(o.price) : 'brak ceny'}
                  {!o.available ? ' · niedostępna' : ''}
                  {!o.matched ? ' · inny produkt' : ''}
                </li>
              ))}
            </ul>
          </details>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (i) => (
        <Chip tone={STATUS[i.decision.kind].tone}>{STATUS[i.decision.kind].label}</Chip>
      ),
    },
  ]

  return (
    <Card
      title="Zmiany cen części"
      note="koszt zakupu i cena sprzedaży pozycji"
      actions={
        <div className="pn-pills" role="group" aria-label="Filtr zmian">
          <FilterPill
            label="Wszystkie"
            count={count('all')}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterPill
            label="Do zatwierdzenia"
            count={count('propose')}
            active={filter === 'propose'}
            onClick={() => setFilter('propose')}
          />
          <FilterPill
            label="Do sprawdzenia"
            count={count('manual')}
            active={filter === 'manual'}
            onClick={() => setFilter('manual')}
          />
          <FilterPill
            label="Niedostępne"
            count={count('unavailable')}
            active={filter === 'unavailable'}
            onClick={() => setFilter('unavailable')}
          />
          <FilterPill
            label="Brak oferty"
            count={count('nooffer')}
            active={filter === 'nooffer'}
            onClick={() => setFilter('nooffer')}
          />
        </div>
      }
    >
      {shown.length > 0 ? (
        <DataTable
          caption="Zmiany cen części"
          columns={columns}
          rows={shown}
          rowKey={(i) => i.key}
        />
      ) : (
        // TODO(krystian): empty-filter sentence.
        <p className={styles.mu}>Brak pozycji w tym widoku.</p>
      )}
    </Card>
  )
}
