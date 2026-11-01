'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { zl } from '../../lib/pricing/format'
import { Alert } from '../ui/Alert'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { DataTable, type Column } from '../ui/DataTable'
import { Icon } from '../ui/icons'
import { PanelPage } from '../ui/PanelPage'
import { Seg } from '../ui/Seg'
import { Sheet } from '../ui/Sheet'
import { deleteOption, setOptionActive, type ActionResult } from './actions'
import { AddOption } from './AddOption'
import type { OptionRow, OptionsTab } from './load'
import styles from './options.module.css'

const TABS: { value: OptionsTab; label: string; add?: string; addTitle?: string }[] = [
  { value: 'case', label: 'Obudowy', add: 'Dodaj obudowę', addTitle: 'Nowa obudowa' },
  { value: 'cooler', label: 'Chłodzenia', add: 'Dodaj chłodzenie', addTitle: 'Nowe chłodzenie' },
  { value: 'ram', label: 'RAM', add: 'Dodaj RAM', addTitle: 'Nowy RAM' },
  { value: 'ssd', label: 'Dyski', add: 'Dodaj dysk', addTitle: 'Nowy dysk' },
  { value: 'level', label: 'Poziomy mocy' },
]

const LEAD =
  'Wszystko, z czego klient składa komputer. Obudowy i chłodzenia widać na stronie z nazwą i zdjęciem; RAM, dyski i części poziomów tylko klasą.'

/**
 * „Opcje konfiguratora” in the browser (panel spec §10). The switch and deleting go through
 * server actions guarded by the G4 hooks (an option in a build stays); the table becomes cards
 * on a phone (`DataTable`).
 */
export function OptionsBoard({ rows, approveHref }: { rows: OptionRow[]; approveHref: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<OptionsTab>('case')
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<OptionRow | null>(null)
  const [message, setMessage] = useState<{
    tone: 'ok' | 'bad'
    title: string
    text?: string
  } | null>(null)
  const [pending, startTransition] = useTransition()

  const current = TABS.find((t) => t.value === tab)!
  const shown = rows.filter((r) => r.tab === tab)
  const count = (t: OptionsTab) => rows.filter((r) => r.tab === t).length

  const report = (outcome: ActionResult, ok: string) => {
    if (outcome.ok) {
      setMessage({ tone: 'ok', title: ok })
      router.refresh()
    } else {
      setMessage({ tone: 'bad', title: 'Nie zmieniono', text: outcome.messages.join(' ') })
    }
  }
  const toggle = (row: OptionRow) =>
    startTransition(async () => {
      const outcome = await setOptionActive({ id: row.id, active: !row.active })
      // TODO(krystian): messages not on the board.
      report(outcome, row.active ? `Wyłączono: ${row.label}` : `Włączono: ${row.label}`)
    })
  const remove = (row: OptionRow) =>
    startTransition(async () => {
      const outcome = await deleteOption({ id: row.id })
      setToDelete(null)
      report(outcome, `Usunięto: ${row.label}`)
    })

  const columns: Column<OptionRow>[] = [
    {
      key: 'item',
      label: tab === 'level' ? 'Poziom' : 'Opcja',
      render: (r) => (
        <span className={styles.item}>
          {tab === 'case' || tab === 'cooler' ? (
            <span className={styles.thumb}>
              {r.photo ? <Image src={r.photo} alt="" width={36} height={40} sizes="36px" /> : null}
            </span>
          ) : null}
          <span>
            <b>{r.label}</b>
            {r.internalModel ? <small>{r.internalModel}</small> : null}
          </span>
        </span>
      ),
    },
    {
      key: 'params',
      label: 'Parametry zgodności',
      render: (r) => (
        <span className={styles.params}>
          {r.params}
          {r.paramsNote ? <small>{r.paramsNote}</small> : null}
        </span>
      ),
    },
    {
      key: 'cost',
      label: 'Koszt',
      align: 'right',
      render: (r) => <span className={styles.mu}>{zl(r.cost)}</span>,
    },
    {
      key: 'price',
      label: 'Na stronie',
      align: 'right',
      render: (r) => (r.price === null ? <Chip tone="info">nowa</Chip> : <b>{zl(r.price)}</b>),
    },
    {
      key: 'builds',
      label: 'W zestawach',
      render: (r) => (
        <span className={styles.mu}>
          {r.builds.length > 0 ? r.builds.join(', ') : 'tylko w konfiguratorze'}
        </span>
      ),
    },
    {
      key: 'sources',
      label: 'Źródła cen',
      render: (r) =>
        r.sources.of !== undefined ? (
          <Chip tone={r.sources.count === r.sources.of ? 'mu' : 'bad'}>
            {r.sources.count}/{r.sources.of} części z ofertą
          </Chip>
        ) : r.sources.count > 0 ? (
          <Chip tone="mu">
            {r.sources.count}{' '}
            {r.sources.count === 1 ? 'źródło' : r.sources.count < 5 ? 'źródła' : 'źródeł'}
          </Chip>
        ) : (
          <Chip tone="bad">brak oferty</Chip>
        ),
    },
    ...(tab === 'level'
      ? []
      : [
          {
            key: 'active',
            label: 'W konfiguratorze',
            render: (r: OptionRow) => (
              <span className="pn-tog">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={`W konfiguratorze: ${r.label}`}
                  checked={r.active ?? false}
                  disabled={pending}
                  onChange={() => toggle(r)}
                />
                <span aria-hidden="true" />
              </span>
            ),
          } satisfies Column<OptionRow>,
        ]),
    {
      key: 'actions',
      label: 'Edycja',
      render: (r) => (
        <span className={styles.acts}>
          <a className="pn-icb" href={r.editPath} aria-label={`Edytuj: ${r.label}`}>
            <Icon name="note" />
          </a>
          {tab === 'level' ? null : (
            <button
              type="button"
              className="pn-icb"
              aria-label={`Usuń: ${r.label}`}
              title={r.builds.length > 0 ? `Używana w: ${r.builds.join(', ')}` : undefined}
              disabled={r.builds.length > 0 || pending}
              onClick={() => setToDelete(r)}
            >
              <Icon name="archive" />
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PanelPage
        title="Opcje konfiguratora"
        lead={LEAD}
        actions={
          current.add ? (
            <button
              type="button"
              className="pn-btn pn-btn--gold"
              onClick={() => {
                setAdding(true)
                setMessage(null)
              }}
              aria-expanded={adding}
            >
              <span aria-hidden="true">+</span>
              {current.add}
            </button>
          ) : null
        }
      />

      <div className={styles.tabs}>
        <Seg
          label="Rodzaj"
          options={TABS.map((t) => ({ value: t.value, label: `${t.label} ${count(t.value)}` }))}
          value={tab}
          onChange={(next) => {
            setTab(next)
            setAdding(false)
          }}
        />
      </div>

      <div aria-live="polite">
        {message ? (
          <div className={styles.message}>
            <Alert tone={message.tone === 'ok' ? 'ok' : 'bad'} title={message.title}>
              {message.text}
            </Alert>
          </div>
        ) : null}
      </div>

      {adding && tab !== 'level' ? (
        <AddOption
          type={tab}
          title={current.addTitle!}
          onClose={() => setAdding(false)}
          onAdded={(label) => {
            setAdding(false)
            // TODO(krystian): message not on the board.
            setMessage({
              tone: 'ok',
              title: `Dodano: ${label}`,
              text: 'Czeka w „Do zatwierdzenia” jako nowa cena; do konfiguratora włączysz ją po publikacji.',
            })
            router.refresh()
          }}
          approveHref={approveHref}
        />
      ) : null}

      <Card>
        <DataTable
          caption={`Opcje: ${current.label}`}
          columns={columns}
          rows={shown}
          rowKey={(r) => `${r.tab}:${r.id}`}
        />
        {/* TODO(krystian): the board says disabling „trafia do zatwierdzenia” — the G4 queue does
            not track „od” prices, the next publication recomputes them (decision 01.11). */}
        <p className={styles.foot}>
          Opcji z gotowego zestawu nie wyłączysz ani nie usuniesz — najpierw zmień zestaw. Wyłączona
          zostaje w historii cen i zapytań; ceny „od” poziomów przeliczy następna publikacja.
        </p>
      </Card>

      <Sheet open={toDelete !== null} onClose={() => setToDelete(null)} label="Usuń opcję">
        {toDelete ? (
          <div className={styles.confirm}>
            <h2>Usunąć „{toDelete.label}”?</h2>
            {/* TODO(krystian): sentence not on the board. */}
            <p className={styles.mu}>
              Opcja zniknie z konfiguratora i z panelu razem z linkami do ofert. Historia cen i
              zapytania zostają.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className="pn-btn" onClick={() => setToDelete(null)}>
                Anuluj
              </button>
              <button
                type="button"
                className="pn-btn pn-btn--gold"
                onClick={() => remove(toDelete)}
                disabled={pending}
              >
                Usuń
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  )
}
