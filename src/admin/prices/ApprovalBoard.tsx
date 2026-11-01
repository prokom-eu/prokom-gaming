'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import { plural } from '../../lib/pl'
import { percent, percentShort, signedZl, zl } from '../../lib/pricing/format'
import { Alert } from '../ui/Alert'
import { ActionBar } from '../ui/ActionBar'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { DataTable, type Column } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { Icon } from '../ui/icons'
import {
  previewSelection,
  publishPrices,
  type PublishResult,
  type SelectionPreview,
} from './actions'
import styles from './panelPrices.module.css'

export type ApprovalRow = {
  key: string
  title: string
  category: string
  reason: string
  /** Never published: always part of the publication, cannot be unticked. */
  isNew: boolean
  published: number | null
  candidate: number
  change: number | null
  builds: string[]
}

type Props = {
  rows: ApprovalRow[]
  minorChanges: number
  minMargin: number
  initial: Extract<SelectionPreview, { ok: true }>
  batches: { batch: number; date: string; by: string | null }[]
  centreHref: string
}

const allKeys = (rows: ApprovalRow[]) => new Set(rows.map((r) => r.key))
const cenN = (n: number) => `${n} ${plural(n, ['cenę', 'ceny', 'cen'])}`
const changeTone = (change: number | null) =>
  change === null || change === 0 ? undefined : change > 0 ? styles.up : styles.down

/**
 * „Do zatwierdzenia” in the browser: ticking items asks the server for the guard again
 * (`previewSelection`, debounced), and „Opublikuj” stays off until the guard for exactly the
 * ticked items says it may go. Gets prices and margins only — never costs.
 */
export function ApprovalBoard({
  rows,
  minorChanges,
  minMargin,
  initial,
  batches,
  centreHref,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(() => allKeys(rows))
  const [preview, setPreview] = useState<SelectionPreview>(initial)
  // The selection the shown preview belongs to; differs from `selected` while checking.
  const [checkedFor, setCheckedFor] = useState<string>(() => keyOf(allKeys(rows), rows))
  const [result, setResult] = useState<PublishResult | null>(null)
  const [publishing, startPublish] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)

  // After a publication the server sends a new queue: start again from it (React's "adjust state
  // when a prop changes" pattern — no effect).
  const [shownRows, setShownRows] = useState(rows)
  if (rows !== shownRows) {
    setShownRows(rows)
    setSelected(allKeys(rows))
    setPreview(initial)
    setCheckedFor(keyOf(allKeys(rows), rows))
  }

  const current = keyOf(selected, rows)
  const checking = checkedFor !== current
  const ready = preview.ok && !checking
  const canPublish = ready && preview.ok && preview.canPublish && !publishing

  const check = (next: Set<string>) => {
    setSelected(next)
    setResult(null)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const id = ++seq.current
      const keys = rows.filter((r) => next.has(r.key)).map((r) => r.key)
      const outcome = await previewSelection({ keys })
      if (id !== seq.current) return // a newer selection is being checked
      setPreview(outcome)
      setCheckedFor(keyOf(next, rows))
    }, 250)
  }

  const toggle = (row: ApprovalRow) => {
    if (row.isNew) return
    const next = new Set(selected)
    if (next.has(row.key)) next.delete(row.key)
    else next.add(row.key)
    check(next)
  }

  const publish = () =>
    startPublish(async () => {
      const keys = rows.filter((r) => selected.has(r.key)).map((r) => r.key)
      const outcome = await publishPrices({ keys })
      setResult(outcome)
      if (outcome.ok) router.refresh()
    })

  const count = rows.filter((r) => r.isNew || selected.has(r.key)).length
  const tone = !ready ? undefined : preview.ok && preview.canPublish ? 'ok' : 'bad'
  const lowest = preview.ok ? preview.lowest : null
  const publishLabel = publishing ? 'Publikuję…' : `Opublikuj ${cenN(count)}`
  const statusChip = checking ? (
    <Chip tone="mu">sprawdzam…</Chip>
  ) : preview.ok && preview.canPublish ? (
    <Chip tone="ok">można publikować</Chip>
  ) : (
    <Chip tone="bad">publikacja zablokowana</Chip>
  )

  const columns: Column<ApprovalRow>[] = [
    {
      key: 'item',
      label: 'Pozycja',
      render: (r) => (
        <span className={styles.item}>
          <b>{r.title}</b>
          <small>
            {r.category} · {r.reason}
          </small>
        </span>
      ),
    },
    {
      key: 'now',
      label: 'Teraz',
      align: 'right',
      render: (r) => <span className={styles.mu}>{zl(r.published)}</span>,
    },
    { key: 'new', label: 'Nowa', align: 'right', render: (r) => <b>{zl(r.candidate)}</b> },
    {
      key: 'change',
      label: 'Zmiana',
      align: 'right',
      render: (r) => <span className={changeTone(r.change)}>{percentOne(r.change)}</span>,
    },
    {
      key: 'builds',
      label: 'Dotyczy',
      render: (r) => (
        <span className={styles.mu}>
          {r.category === 'Usługa'
            ? 'wszystkie zestawy'
            : r.builds.length > 0
              ? r.builds.join(', ')
              : 'tylko w konfiguratorze'}
        </span>
      ),
    },
  ]

  if (rows.length === 0) {
    return (
      <Card title="Zmiany cen">
        {/* TODO(krystian): empty-state sentence — not on the board. */}
        <EmptyState title="Nic nie czeka na zatwierdzenie" icon="check">
          Ceny na stronie zgadzają się z dzisiejszymi kosztami
          {minorChanges > 0 ? ` (drobne zmiany poniżej progu: ${minorChanges})` : ''}.{' '}
          <a className="pn-link" href={centreHref}>
            Centrum cen
          </a>
        </EmptyState>
      </Card>
    )
  }

  return (
    <div className={styles.board}>
      <Card
        title="Zmiany cen"
        note={`${count} z ${rows.length} zaznaczonych`}
        actions={
          <>
            <button
              type="button"
              className="pn-btn pn-btn--quiet pn-btn--sm"
              onClick={() => check(allKeys(rows))}
            >
              Tylko powyżej progu
            </button>
            <button
              type="button"
              className="pn-btn pn-btn--quiet pn-btn--sm"
              onClick={() => check(new Set(rows.filter((r) => r.isNew).map((r) => r.key)))}
            >
              Odznacz
            </button>
          </>
        }
      >
        <DataTable
          caption="Zmiany cen do zatwierdzenia"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.key}
          selection={{
            label: (r) => `Publikuj: ${r.title}`,
            checked: (r) => r.isNew || selected.has(r.key),
            onToggle: toggle,
          }}
        />
        {minorChanges > 0 ? (
          <p className={styles.foot}>
            {/* TODO(krystian): sentence not on the board (minor changes stay off the queue, G4). */}
            Drobne zmiany poniżej progu: {minorChanges} — te ceny zostają na stronie bez zmian.
          </p>
        ) : null}
      </Card>

      <div className={styles.side}>
        <Card title="Strażnik marży" actions={statusChip} className={styles.guard}>
          <div aria-live="polite" aria-busy={checking}>
            {preview.ok ? (
              <>
                <p className={styles.text}>
                  Sprawdzono <b>{(preview.compatible ?? 0).toLocaleString('pl-PL')}</b> zgodnych
                  konfiguracji z cenami po tej publikacji i dzisiejszymi kosztami.
                </p>
                <dl className="pn-kv">
                  <dt>Najniższa marża</dt>
                  <dd style={tone ? { color: `var(--p-${tone})` } : undefined}>
                    {percent(lowest?.margin ?? null)}
                  </dd>
                  <dt>Twoje minimum</dt>
                  <dd>{percentShort(minMargin)}</dd>
                  <dt>Najsłabsza konfiguracja</dt>
                  <dd>{lowest?.config ?? '—'}</dd>
                </dl>
              </>
            ) : null}
            {!checking && (!preview.ok || !preview.canPublish) && preview.messages.length > 0 ? (
              <Alert title="Publikacja zablokowana — co podnieść">
                <ul className={styles.problems}>
                  {preview.messages.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
          </div>
          <button
            type="button"
            className={`pn-btn pn-btn--gold ${styles.publish}`}
            onClick={publish}
            disabled={!canPublish}
          >
            <Icon name="check" />
            {publishLabel}
          </button>
          <p className={styles.note}>
            Ceny na stronie zmienią się dopiero po kliknięciu. Opublikowane ceny trafiają do
            historii (30 dni dla promocji).
          </p>
          <div aria-live="polite">
            {result?.ok === true ? (
              <Alert tone="ok" title={`Opublikowano partię ${result.batch}`}>
                {result.changed} zmienionych cen.
              </Alert>
            ) : null}
            {result?.ok === false ? (
              <Alert title="Publikacja zablokowana — na stronie nic się nie zmieniło.">
                <ul className={styles.problems}>
                  {result.messages.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
          </div>
        </Card>

        <Card title="Co zobaczy klient">
          {preview.ok ? (
            <dl className="pn-kv">
              <dt>Zestawy droższe</dt>
              <dd>{preview.client.dearer}</dd>
              <dt>Zestawy tańsze</dt>
              <dd>{preview.client.cheaper}</dd>
              <dt>Bez zmiany ceny</dt>
              <dd>{preview.client.same}</dd>
              <dt>Średnia marża gotowców</dt>
              <dd>{percentShort(preview.client.averageMargin)}</dd>
              <dt>Największa zmiana</dt>
              <dd>{signedZl(preview.client.biggestChange)}</dd>
            </dl>
          ) : (
            <p className={styles.text}>—</p>
          )}
        </Card>

        <Card title="Historia publikacji">
          <ul className={styles.history}>
            {batches.map((b) => (
              <li key={b.batch}>
                <Icon name="check" />
                <span>
                  <b>Partia #{b.batch}</b>
                  <small>
                    {b.date}
                    {b.by ? ` · ${b.by}` : ''}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ActionBar
        value={percent(lowest?.margin ?? null)}
        note={`najniższa marża · ${checking ? 'sprawdzam…' : preview.ok && preview.canPublish ? 'można publikować' : 'publikacja zablokowana'}`}
        tone={tone}
      >
        <button
          type="button"
          className="pn-btn pn-btn--gold"
          onClick={publish}
          disabled={!canPublish}
        >
          <Icon name="check" />
          {publishLabel}
        </button>
      </ActionBar>
    </div>
  )
}

/** Identity of a selection (new items are always in). */
function keyOf(selected: Set<string>, rows: ApprovalRow[]): string {
  return rows
    .filter((r) => r.isNew || selected.has(r.key))
    .map((r) => r.key)
    .join(',')
}

/** „+4,3%” — one decimal like the board; „nowa” for a never-published item. */
function percentOne(change: number | null): string {
  if (change === null) return 'nowa'
  const text = `${(change * 100).toFixed(1).replace('.', ',').replace('-', '−')}%`
  return change > 0 ? `+${text}` : text
}
