'use client'

import { useState } from 'react'

import { plural } from '../../lib/pl'
import { marginStatus, percentShort, zl } from '../../lib/pricing/format'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { DataTable, type Column } from '../ui/DataTable'
import { MarginBar } from '../ui/MarginBar'
import { Seg } from '../ui/Seg'
import type { BuildMargins, MarginMode } from './margins'

type Props = {
  builds: BuildMargins[]
  modes: MarginMode[]
  minMargin: number
  warnMargin: number
  /** „25.10” and „25.10.2026” — the batch on the site. */
  batchShort: string
  batchDate: string
  queueCount: number
}

/**
 * „Marża gotowych zestawów” (panel spec §3 pt 4, board Main): 16 builds, lowest margin first,
 * with the switch between the publication, today's costs and the prices after approval. Gets
 * prices and margins only — never costs (computed on the server, `margins.ts`).
 */
export function MarginTable({
  builds,
  modes,
  minMargin,
  warnMargin,
  batchShort,
  batchDate,
  queueCount,
}: Props) {
  const [mode, setMode] = useState<MarginMode>('today')
  const label: Record<MarginMode, string> = {
    batch: `Ceny ${batchShort}`,
    today: 'Dzisiejsze koszty',
    after: 'Po zatwierdzeniu',
  }
  // TODO(krystian): the board says „koszty z porannego sprawdzenia” and „cen z raportu” — the
  // morning price check comes with P7; until then today's costs are the ones in the panel.
  const note: Record<MarginMode, string> = {
    batch: `Marża przy cenach i kosztach z publikacji ${batchDate}.`,
    today: 'Te same ceny na stronie, dzisiejsze koszty. Tak jest teraz.',
    after: `Po zatwierdzeniu ${queueCount} ${plural(queueCount, ['ceny', 'cen', 'cen'])}: nowe ceny i dzisiejsze koszty.`,
  }
  const minText = percentShort(minMargin)
  const of = (b: BuildMargins) => b.modes[mode] ?? { price: null, margin: null }

  const columns: Column<BuildMargins>[] = [
    {
      key: 'name',
      label: 'Zestaw',
      render: (b) => (
        <span className="pn-build">
          <span
            className="pn-sigil"
            aria-hidden="true"
            style={{
              ['--sigil' as string]: `url(/sigils/${b.sigil}-plain.svg)`,
              color: `var(--c-${b.slug}, var(--p-gold))`,
            }}
          />
          <b className="pn-build__name">{b.name}</b>
          <small>{b.tier}</small>
        </span>
      ),
    },
    { key: 'price', label: 'Cena', align: 'right', render: (b) => zl(of(b).price) },
    {
      key: 'bar',
      label: `Marża (linia = ${minText})`,
      render: (b) => (
        <MarginBar margin={of(b).margin} minMargin={minMargin} warnMargin={warnMargin} />
      ),
    },
    {
      key: 'margin',
      label: 'Marża',
      align: 'right',
      render: (b) => (
        <Chip tone={marginStatus(of(b).margin, minMargin, warnMargin)}>
          {percentShort(of(b).margin)}
        </Chip>
      ),
    },
  ]

  return (
    <Card
      title="Marża gotowych zestawów"
      className="pn-dash__margins"
      actions={
        modes.length > 1 ? (
          <Seg
            label="Ceny i koszty"
            options={modes.map((m) => ({ value: m, label: label[m] }))}
            value={mode}
            onChange={setMode}
          />
        ) : undefined
      }
    >
      <p className="pn-note" aria-live="polite">
        {note[mode]}
      </p>
      <DataTable
        caption={`Marża gotowych zestawów: ${label[mode]}`}
        columns={columns}
        rows={builds}
        rowKey={(b) => b.slug}
      />
    </Card>
  )
}
