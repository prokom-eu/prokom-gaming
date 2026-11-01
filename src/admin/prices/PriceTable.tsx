'use client'

import { useState } from 'react'

import { marginStatus, percentShort, zl } from '../../lib/pricing/format'
import { Card } from '../ui/Card'
import { Chip, type Tone } from '../ui/Chip'
import { DataTable, type Column } from '../ui/DataTable'
import { FilterPill } from '../ui/FilterPill'
import { Icon } from '../ui/icons'
import { Seg } from '../ui/Seg'
import type { Category } from './load'
import styles from './panelPrices.module.css'

/** One row of the prices table — panel only (costs and internal models). */
export type PriceRowView = {
  key: string
  category: Category
  title: string
  detail: string | null
  costAtBatch: number | null
  costToday: number
  published: number | null
  candidate: number
  margin: number | null
  costSource: 'market' | 'invoice' | 'mixed' | 'settings'
  status: 'urgent' | 'new' | 'queued' | 'minor' | 'same'
  /** No usable offer in the last price check (P7); for a level: one of its parts. */
  unavailable: boolean
  editPath: string
}

type StateFilter = 'all' | 'changed' | 'queued' | 'unavailable'
type CategoryFilter = 'all' | Category

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'level', label: 'Poziomy mocy' },
  { value: 'case', label: 'Obudowy' },
  { value: 'cooler', label: 'Chłodzenia' },
  { value: 'ram', label: 'RAM' },
  { value: 'ssd', label: 'Dyski' },
  { value: 'service', label: 'Usługa' },
]

const STATUS: Record<PriceRowView['status'], { tone: Tone; label: string }> = {
  urgent: { tone: 'bad', label: 'pilne' },
  new: { tone: 'info', label: 'nowa' },
  queued: { tone: 'gold', label: 'do zatwierdzenia' },
  minor: { tone: 'mu', label: 'poniżej progu' },
  same: { tone: 'ok', label: 'bez zmian' },
}

const SOURCE: Record<PriceRowView['costSource'], string> = {
  market: 'sklepy',
  invoice: 'faktura',
  mixed: 'sklepy i faktura',
  settings: 'ustawienia',
}

const isChanged = (r: PriceRowView) => r.status !== 'same'
const isQueued = (r: PriceRowView) =>
  r.status === 'queued' || r.status === 'urgent' || r.status === 'new'

/** Cost change since the batch: „+1,7%”, one decimal like the board. */
function costChange(r: PriceRowView): { text: string; tone?: string } {
  if (r.costAtBatch === null || r.costAtBatch === 0) return { text: '—' }
  const change = (r.costToday - r.costAtBatch) / r.costAtBatch
  if (Math.abs(change) < 0.0005) return { text: '0%' }
  const text = `${(change * 100).toFixed(1).replace('.', ',').replace('-', '−')}%`
  return change > 0 ? { text: `+${text}`, tone: styles.up } : { text, tone: styles.down }
}

/**
 * „Pozycje” of the prices centre (panel spec §8, board Ceny): every sold item with cost at the
 * batch and today, price on the site, the price list's candidate, margin, cost source and status.
 * Filters by state (default: changed) and category; cards on a phone (`DataTable`).
 */
export function PriceTable({
  rows,
  batchShort,
  minMargin,
  warnMargin,
}: {
  rows: PriceRowView[]
  /** „25.10” — the batch on the site, for the column label. */
  batchShort: string
  minMargin: number
  warnMargin: number
}) {
  const changedCount = rows.filter(isChanged).length
  const [state, setState] = useState<StateFilter>(changedCount > 0 ? 'changed' : 'all')
  const [category, setCategory] = useState<CategoryFilter>('all')

  const byState = (r: PriceRowView) =>
    state === 'all'
      ? true
      : state === 'changed'
        ? isChanged(r)
        : state === 'queued'
          ? isQueued(r)
          : r.unavailable
  const byCategory = (r: PriceRowView) => category === 'all' || r.category === category
  const shown = rows.filter((r) => byState(r) && byCategory(r))
  const inState = rows.filter(byState)
  const count = (c: CategoryFilter) =>
    c === 'all' ? inState.length : inState.filter((r) => r.category === c).length

  const columns: Column<PriceRowView>[] = [
    {
      key: 'item',
      label: 'Pozycja',
      render: (r) => (
        <span className={styles.item}>
          <b>{r.title}</b>
          {r.detail ? <small>{r.detail}</small> : null}
        </span>
      ),
    },
    {
      key: 'batch',
      label: `Koszt ${batchShort}`,
      align: 'right',
      render: (r) => <span className={styles.mu}>{zl(r.costAtBatch)}</span>,
    },
    { key: 'today', label: 'Dziś', align: 'right', render: (r) => <b>{zl(r.costToday)}</b> },
    {
      key: 'change',
      label: 'Zmiana',
      align: 'right',
      render: (r) => {
        const c = costChange(r)
        return <span className={c.tone}>{c.text}</span>
      },
    },
    {
      key: 'site',
      label: 'Na stronie',
      align: 'right',
      render: (r) => <span className={styles.mu}>{zl(r.published)}</span>,
    },
    { key: 'list', label: 'Wg cennika', align: 'right', render: (r) => <b>{zl(r.candidate)}</b> },
    {
      key: 'margin',
      label: 'Marża pozycji',
      align: 'right',
      render: (r) => {
        const status = marginStatus(r.margin, minMargin, warnMargin)
        // Cases and coolers carry no margin floor (ADR-G002): their margin is information only.
        const floor = r.category !== 'case' && r.category !== 'cooler'
        return (
          <span style={floor && status !== 'ok' ? { color: `var(--p-${status})` } : undefined}>
            {percentShort(r.margin)}
          </span>
        )
      },
    },
    {
      key: 'source',
      label: 'Źródło kosztu',
      render: (r) => <span className={styles.mu}>{SOURCE[r.costSource]}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Chip tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Chip>,
    },
    {
      key: 'edit',
      label: 'Edycja',
      render: (r) => (
        <a className="pn-icb" href={r.editPath} aria-label={`Edytuj: ${r.title}`}>
          <Icon name="note" />
        </a>
      ),
    },
  ]

  const queuedCount = rows.filter(isQueued).length

  return (
    <Card
      title="Pozycje"
      actions={
        <div className="pn-pills" role="group" aria-label="Stan pozycji">
          <FilterPill
            label="Wszystkie"
            count={rows.length}
            active={state === 'all'}
            onClick={() => setState('all')}
          />
          <FilterPill
            label="Zmienione"
            count={changedCount}
            active={state === 'changed'}
            onClick={() => setState('changed')}
          />
          <FilterPill
            label="Do zatwierdzenia"
            count={queuedCount}
            active={state === 'queued'}
            onClick={() => setState('queued')}
          />
          <FilterPill
            label="Niedostępne"
            count={rows.filter((r) => r.unavailable).length}
            active={state === 'unavailable'}
            onClick={() => setState('unavailable')}
          />
        </div>
      }
    >
      <div className={styles.tableBar}>
        <Seg
          label="Kategoria"
          options={CATEGORIES.map((c) => ({
            value: c.value,
            label: `${c.label} ${count(c.value)}`,
          }))}
          value={category}
          onChange={setCategory}
        />
      </div>
      {shown.length > 0 ? (
        <DataTable caption="Pozycje cennika" columns={columns} rows={shown} rowKey={(r) => r.key} />
      ) : (
        // TODO(krystian): empty-filter sentence — not on the board.
        <p className={styles.foot}>Brak pozycji w tym widoku.</p>
      )}
    </Card>
  )
}
