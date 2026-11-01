'use client'

import { useState } from 'react'

import { percentShort } from '../../lib/pricing/format'
import {
  WHAT_IF_GROUPS,
  WHAT_IF_MAX,
  WHAT_IF_MIN,
  whatIf,
  type WhatIfBuild,
  type WhatIfGroup,
  type WhatIfShifts,
} from '../../lib/pricing/whatIf'
import { Card } from '../ui/Card'
import styles from './panelPrices.module.css'

const LABEL: Record<WhatIfGroup, string> = {
  cpu: 'Procesory',
  gpu: 'Karty graficzne',
  ram: 'RAM',
  ssd: 'Dyski',
  rest: 'Płyty, zasilacze, obudowy, chłodzenia',
}

const STEP = 0.01

/** „+8%”, „0%”, „−5%” — whole percent, like the board's slider labels. */
const shiftLabel = (v: number) => {
  const n = Math.round(v * 100)
  return n > 0 ? `+${n}%` : n < 0 ? `−${-n}%` : '0%'
}

/**
 * „Co jeśli?” (panel spec §8, board Ceny): shift a group's costs and see the ready builds'
 * margins at the prices on the site. Runs in the browser (`whatIf`), saves nothing. The build
 * costs come from the server for the panel only.
 */
export function WhatIfCard({
  builds,
  minMargin,
  warnMargin,
}: {
  builds: WhatIfBuild[]
  minMargin: number
  warnMargin: number
}) {
  const [shifts, setShifts] = useState<WhatIfShifts>({})
  const result = whatIf(builds, shifts, { minMargin, warnMargin })
  const tone = (m: number | null) =>
    m === null || m < minMargin ? 'var(--p-bad)' : m < warnMargin ? 'var(--p-warn)' : undefined

  return (
    <Card
      title="Co jeśli?"
      note="przesuń koszt grupy części i zobacz marżę gotowców przy cenach, które są teraz na stronie"
      actions={
        <button
          type="button"
          className="pn-btn pn-btn--quiet pn-btn--sm"
          onClick={() => setShifts({})}
          disabled={Object.values(shifts).every((v) => !v)}
        >
          Wyzeruj
        </button>
      }
    >
      <div className={styles.whatIf}>
        <div className={styles.sliders}>
          {WHAT_IF_GROUPS.map((group) => {
            const value = shifts[group] ?? 0
            const id = `what-if-${group}`
            return (
              <div key={group} className={styles.slider}>
                <label htmlFor={id}>
                  <span>{LABEL[group]}</span>
                  <b aria-hidden="true">{shiftLabel(value)}</b>
                </label>
                <input
                  id={id}
                  type="range"
                  min={WHAT_IF_MIN}
                  max={WHAT_IF_MAX}
                  step={STEP}
                  value={value}
                  aria-valuetext={shiftLabel(value)}
                  onChange={(e) => setShifts((s) => ({ ...s, [group]: Number(e.target.value) }))}
                />
              </div>
            )
          })}
        </div>
        <dl className="pn-kv" aria-live="polite">
          <dt>Średnia marża gotowców</dt>
          <dd style={{ color: tone(result.averageMargin) }}>
            {percentShort(result.averageMargin)}
          </dd>
          <dt>Najsłabszy zestaw</dt>
          <dd style={{ color: tone(result.weakest?.margin ?? null) }}>
            {result.weakest
              ? `${result.weakest.name} · ${percentShort(result.weakest.margin)}`
              : '—'}
          </dd>
          <dt>Zestawy poniżej {percentShort(warnMargin)}</dt>
          <dd>{result.belowWarn}</dd>
          <dt>Zestawy poniżej {percentShort(minMargin)}</dt>
          <dd style={{ color: result.belowMin > 0 ? 'var(--p-bad)' : undefined }}>
            {result.belowMin}
          </dd>
        </dl>
      </div>
    </Card>
  )
}
