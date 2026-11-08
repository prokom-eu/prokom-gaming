'use client'

import { useState, type CSSProperties } from 'react'

import { RESOLUTIONS, RESOLUTION_LABELS, type FpsListRows, type Resolution } from '@/lib/fps'

import { HowWeMeasure } from './HowWeMeasure'
import { SourceLabel } from './SourceLabel'
import { Segmented } from './ui/Segmented'

type Props = {
  title: string
  /** CSS colour of the bars, e.g. `var(--c-wampir)`. */
  color: string
  defaultResolution: Resolution
  /** Rows computed on the server for every resolution — switching is instant, no request. */
  rows: FpsListRows
}

export function FpsListClient({ title, color, defaultResolution, rows }: Props) {
  const [resolution, setResolution] = useState<Resolution>(defaultResolution)
  const current = rows[resolution]
  const options = RESOLUTIONS.map((r) => ({
    value: r,
    label: RESOLUTION_LABELS[r],
    disabled: rows[r].length === 0,
  }))

  return (
    <section className="fps" style={{ '--c': color } as CSSProperties}>
      <div className="fps__head">
        <h2 className="h">{title}</h2>
        <Segmented
          label="Rozdzielczość"
          options={options}
          value={resolution}
          onChange={setResolution}
        />
      </div>
      <p className="fps__note">
        Średnia liczba klatek na sekundę, ustawienia wysokie lub najwyższe, bez generatora klatek.
        Przy każdym wyniku piszemy, skąd pochodzi.
      </p>
      <ul className="fps__list">
        {current.map((row) => (
          <li key={row.game} className="fps__row">
            <span className="fps__game">
              {row.name}
              {row.note && <small>{row.note}</small>}
            </span>
            <span className="fps__bar" aria-hidden="true">
              <s style={{ width: `${row.percent}%` }} />
            </span>
            <b>{row.text}</b>
            <SourceLabel kind={row.kind} />
          </li>
        ))}
      </ul>
      <HowWeMeasure rows={current} />
    </section>
  )
}
