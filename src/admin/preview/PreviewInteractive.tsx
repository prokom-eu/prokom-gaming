'use client'

import { useState } from 'react'

import { Card } from '../ui/Card'
import { DataTable, type Column } from '../ui/DataTable'
import { FilterPill } from '../ui/FilterPill'
import { Seg } from '../ui/Seg'
import { Sheet } from '../ui/Sheet'

type Row = {
  key: string
  name: string
  kind: string
  now: string
  next: string
  change: string
  builds: string
}

// Sample rows in the shape of the approval list (stany/tel-05) — made up, not prices.
const ROWS: Row[] = [
  {
    key: 'r1',
    name: '16 GB DDR4 3200 (2x8)',
    kind: 'RAM · powyżej progu 3%',
    now: '690 zł',
    next: '720 zł',
    change: '+4,3%',
    builds: 'Skrzat, Licho',
  },
  {
    key: 'r2',
    name: '32 GB DDR4 3200 (2x16)',
    kind: 'RAM · powyżej progu 3%',
    now: '1 100 zł',
    next: '1 140 zł',
    change: '+3,6%',
    builds: 'tylko w konfiguratorze',
  },
  {
    key: 'r3',
    name: '16 GB DDR5 6000 (2x8)',
    kind: 'RAM · powyżej progu 3%',
    now: '1 250 zł',
    next: '1 350 zł',
    change: '+8,0%',
    builds: 'Bies, Wodnik',
  },
]

const COLUMNS: Column<Row>[] = [
  {
    key: 'name',
    label: 'Pozycja',
    render: (r) => (
      <>
        {r.name}
        <small>{r.kind}</small>
      </>
    ),
  },
  { key: 'now', label: 'Teraz', align: 'right', render: (r) => r.now },
  { key: 'next', label: 'Nowa', align: 'right', render: (r) => <b>{r.next}</b> },
  {
    key: 'change',
    label: 'Zmiana',
    align: 'right',
    render: (r) => <span style={{ color: 'var(--p-bad)' }}>{r.change}</span>,
  },
  { key: 'builds', label: 'Dotyczy', render: (r) => r.builds },
]

/** The interactive half of the preview: segments, filters, selectable table and a sheet. */
export function PreviewInteractive() {
  const [seg, setSeg] = useState<'batch' | 'today' | 'after'>('today')
  const [filter, setFilter] = useState('all')
  const [picked, setPicked] = useState<Set<string>>(new Set(['r1', 'r2']))
  const [sheet, setSheet] = useState(false)

  const toggle = (row: Row) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(row.key)) next.delete(row.key)
      else next.add(row.key)
      return next
    })

  return (
    <>
      <Card
        title="Zmiany cen"
        note={`${picked.size} z ${ROWS.length} zaznaczonych`}
        actions={
          <Seg
            label="Ceny"
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'batch', label: 'Ceny 25.10' },
              { value: 'today', label: 'Dzisiejsze koszty' },
              { value: 'after', label: 'Po zatwierdzeniu' },
            ]}
          />
        }
      >
        <div className="pn-pills" style={{ marginBottom: 14 }}>
          {[
            ['all', 'Wszystkie', 15],
            ['queue', 'Do zatwierdzenia', 11],
            ['below', 'Poniżej progu', 4],
            ['na', 'Niedostępne', 1],
          ].map(([key, label, n]) => (
            <FilterPill
              key={key}
              label={String(label)}
              count={Number(n)}
              active={filter === key}
              onClick={() => setFilter(String(key))}
            />
          ))}
        </div>
        <DataTable
          caption="Zmiany cen (przykład)"
          columns={COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.key}
          selection={{
            label: (r) => `Zatwierdź: ${r.name}`,
            checked: (r) => picked.has(r.key),
            onToggle: toggle,
          }}
        />
      </Card>

      <Card title="Arkusz od dołu">
        <button type="button" className="pn-btn" onClick={() => setSheet(true)}>
          Otwórz arkusz
        </button>
        <Sheet open={sheet} onClose={() => setSheet(false)} label="Przykładowy arkusz">
          <h2>Przykładowy arkusz</h2>
          <p style={{ color: 'var(--p-tx2)' }}>
            Zamyka go Esc, dotknięcie tła albo przeciągnięcie w dół.
          </p>
        </Sheet>
      </Card>
    </>
  )
}
