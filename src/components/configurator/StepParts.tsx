import Image from 'next/image'
import { useState, type ReactNode, type RefObject } from 'react'

import { Chip } from '@/components/ui/Chip'
import type { LightKey } from '@/lib/buildPage'
import {
  CASE_FILTERS,
  caseMatches,
  configWarnings,
  COOLER_TABS,
  coolerIntro,
  optionStates,
  type CaseFilter,
  type ConfiguratorState,
  type OptionState,
} from '@/lib/configurator'
import type { ConfiguratorOption } from '@/lib/configurator.server'
import { signedZl, zl } from '@/lib/pricing/format'
import { lookupPrice } from '@/lib/pricing/snapshot'

import type { PricedData } from './Configurator'
import { LightPicker } from './LightPicker'
import type { ConfiguratorView } from './view'

type StepProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
  data: PricedData
  state: ConfiguratorState
  view: ConfiguratorView
  onPick: (code: string) => void
}

const AIO_TEXT: Record<string, string> = {
  none: 'bez AIO 360',
  top_only: 'AIO 360 (góra)',
}

/** Step 3 (board `show2`): cases with a photo, filters, light colour. */
export function StepCase({
  headingRef,
  data,
  state,
  view,
  onPick,
  onLight,
}: StepProps & { onLight: (light: LightKey | null) => void }) {
  const [filter, setFilter] = useState<CaseFilter>('all')
  const states = optionStates('case', state.config, data, data.prices).filter((s) => {
    const o = view.option(s.code)
    return o ? caseMatches(filter, o) : false
  })
  const own = view.build?.config.case

  return (
    <div className="cf-step">
      <h2 ref={headingRef} tabIndex={-1} className="h">
        Obudowa
      </h2>
      <p className="cf-mut">
        Pokazujemy tylko te, w których zmieści się Twoja karta ({view.level.gpuLengthMm} mm) i
        chłodzenie. Cena przy każdej to dopłata względem obecnego wyboru.
      </p>
      <div className="cf-chips cf-flt" role="group" aria-label="Rodzaj obudowy">
        {CASE_FILTERS.map((f) => (
          <Chip key={f.key} pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
      </div>
      <OptionGrid
        states={states}
        view={view}
        prices={data.prices.option}
        own={own}
        chosen="wybrana"
        onPick={onPick}
        specs={(o) =>
          o.type === 'case' ? [`karta do ${o.gpuMaxMm} mm`, AIO_TEXT[o.aio360] ?? 'AIO 360'] : []
        }
      />
      <LightPicker value={state.light} ownColor={`var(--c-${view.level.build})`} onPick={onLight} />
    </div>
  )
}

/** Step 4 (board `show3`): AIO 360 or air, fitting the chosen case; warnings below. */
export function StepCooler({ headingRef, data, state, view, onPick }: StepProps) {
  const selected = view.option(state.config.cooler)
  const [tab, setTab] = useState<'aio360' | 'air'>(
    selected?.type === 'cooler' ? selected.kind : 'aio360',
  )
  const states = optionStates('cooler', state.config, data, data.prices).filter((s) => {
    const o = view.option(s.code)
    return o?.type === 'cooler' && o.kind === tab
  })
  const caseItem = view.option(state.config.case)
  const warnings = configWarnings(state.config, data)

  return (
    <div className="cf-step">
      <h2 ref={headingRef} tabIndex={-1} className="h">
        Chłodzenie procesora
      </h2>
      {caseItem?.type === 'case' && (
        <p className="cf-mut">
          {coolerIntro(view.level, {
            label: caseItem.label,
            coolerMaxMm: caseItem.coolerMaxMm,
            aio360: caseItem.aio360,
          })}
        </p>
      )}
      <div className="cf-seg" role="group" aria-label="Rodzaj chłodzenia">
        {COOLER_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <OptionGrid
        states={states}
        view={view}
        prices={data.prices.option}
        own={view.build?.config.cooler}
        chosen="wybrane"
        onPick={onPick}
        specs={(o) =>
          o.type === 'cooler'
            ? [
                o.kind === 'aio360'
                  ? `chłodnica ${o.radiatorThicknessMm ?? '—'} mm grubości`
                  : `wysokość ${o.heightMm ?? '—'} mm`,
              ]
            : []
        }
      />
      <p className="cf-fine" role="status">
        {warnings.length > 0
          ? warnings.join(' ')
          : 'Każde chłodzenie montujemy i testujemy pod pełnym obciążeniem przed wysyłką.'}
      </p>
    </div>
  )
}

/** Option cards with a photo (board `.og` / `.oc`): greyed out with the reason, never hidden. */
function OptionGrid({
  states,
  view,
  prices,
  own,
  chosen,
  onPick,
  specs,
}: {
  states: OptionState[]
  view: ConfiguratorView
  prices: Record<string, number>
  own: string | undefined
  chosen: string
  onPick: (code: string) => void
  specs: (o: ConfiguratorOption) => string[]
}) {
  return (
    <ul className="cf-og">
      {states.map((s) => {
        const o = view.option(s.code)
        if (!o) return null
        const sell = lookupPrice(prices, s.code)
        const reasonId = `cf-why-${s.code}`
        return (
          <li key={s.code}>
            <button
              type="button"
              className={o.color === 'biały' ? 'cf-oc is-white' : 'cf-oc'}
              aria-pressed={s.selected}
              // Greyed out but focusable, so a screen reader reaches the reason (ADR-G002 §6).
              aria-disabled={s.disabled || undefined}
              aria-describedby={s.reason ? reasonId : undefined}
              onClick={() => !s.disabled && onPick(s.code)}
            >
              <span className="cf-oc__img">
                {o.photo && (
                  <Image src={o.photo.src} alt="" width={444} height={505} loading="lazy" />
                )}
                {s.code === own && view.build && (
                  <em className="cf-oc__tag">w zestawie {view.build.name}</em>
                )}
              </span>
              <span className="cf-oc__t">
                <b>{o.label}</b>
                {o.description && <span>{o.description}</span>}
              </span>
              <Specs items={specs(o)} />
              <span className="cf-oc__p">
                <b>{s.selected ? chosen : signedZl(s.surcharge)}</b>
                {sell !== undefined && <small>{zl(sell)}</small>}
              </span>
              {s.reason && (
                <span className="cf-oc__x" id={reasonId}>
                  {s.reason}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Specs({ items }: { items: string[] }): ReactNode {
  if (items.length === 0) return null
  return (
    <span className="cf-oc__s">
      {items.map((t) => (
        <i key={t}>{t}</i>
      ))}
    </span>
  )
}
