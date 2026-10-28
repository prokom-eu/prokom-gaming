import type { RefObject } from 'react'

import {
  capacityText,
  optionStates,
  RAM_USE,
  SSD_USE,
  type ConfiguratorState,
  type OptionState,
} from '@/lib/configurator'
import { signedZl } from '@/lib/pricing/format'
import type { OptionType } from '@/lib/pricing/types'

import type { PricedData } from './Configurator'
import type { ConfiguratorView } from './view'

/** „32 GB DDR5 6000 CL30 (2x16)” → „DDR5 6000 CL30 (2x16)” (board: the size is the big number). */
const withoutSize = (label: string) => label.replace(/^\d+ (GB|TB) /, '')

/** Step 5 (board `show4`): RAM of the level's type and the disk, minimums greyed out. */
export function StepMemory({
  headingRef,
  data,
  state,
  view,
  onPick,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
  data: PricedData
  state: ConfiguratorState
  view: ConfiguratorView
  onPick: (slot: OptionType, code: string) => void
}) {
  const ram = optionStates('ram', state.config, data, data.prices)
  const ssd = optionStates('ssd', state.config, data, data.prices)

  return (
    <div className="cf-step">
      <h2 ref={headingRef} tabIndex={-1} className="h">
        Pamięć i dysk
      </h2>
      <p className="cf-mut">
        Pamięć zawsze w dwóch kościach. Minimum dla tego poziomu: {view.level.minRamGb} GB RAM i
        dysk {capacityText(view.level.minSsdGb)}.
      </p>
      <h3 className="cf-lbl" id="cf-ram">
        Pamięć RAM {view.level.ramType}
      </h3>
      <Cards
        labelledBy="cf-ram"
        states={ram}
        view={view}
        use={RAM_USE}
        chosen="wybrana"
        onPick={(code) => onPick('ram', code)}
      />
      <h3 className="cf-lbl" id="cf-ssd">
        Dysk NVMe
      </h3>
      <Cards
        labelledBy="cf-ssd"
        states={ssd}
        view={view}
        use={SSD_USE}
        chosen="wybrany"
        onPick={(code) => onPick('ssd', code)}
      />
    </div>
  )
}

function Cards({
  labelledBy,
  states,
  view,
  use,
  chosen,
  onPick,
}: {
  labelledBy: string
  states: OptionState[]
  view: ConfiguratorView
  use: Record<number, string>
  chosen: string
  onPick: (code: string) => void
}) {
  // Board order: by size (the greyed-out minimum stays in its place, not at the end).
  const sorted = [...states].sort((a, b) => capacityOf(view, a) - capacityOf(view, b))
  return (
    <ul className="cf-mg" aria-labelledby={labelledBy}>
      {sorted.map((s) => {
        const o = view.option(s.code)
        if (!o || (o.type !== 'ram' && o.type !== 'ssd')) return null
        const reasonId = `cf-why-${s.code}`
        return (
          <li key={s.code}>
            <button
              type="button"
              className="cf-mc"
              aria-pressed={s.selected}
              aria-disabled={s.disabled || undefined}
              aria-describedby={s.reason ? reasonId : undefined}
              onClick={() => !s.disabled && onPick(s.code)}
            >
              <b>{capacityText(o.capacityGb)}</b>
              <span>{withoutSize(o.label)}</span>
              {use[o.capacityGb] && <em>{use[o.capacityGb]}</em>}
              <strong>{s.selected ? chosen : signedZl(s.surcharge)}</strong>
              {s.reason && <small id={reasonId}>{s.reason}</small>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function capacityOf(view: ConfiguratorView, s: OptionState): number {
  const o = view.option(s.code)
  return o && (o.type === 'ram' || o.type === 'ssd') ? o.capacityGb : 0
}
