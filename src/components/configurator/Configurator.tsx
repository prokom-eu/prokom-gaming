'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { IconArrow, IconClose } from '@/components/icons'
import { Button, ButtonLink } from '@/components/ui/Button'
import {
  buildMatch,
  configInquiryHref,
  levelChangeMessage,
  stateQuery,
  STEPS,
  switchLevel,
  type ConfiguratorState,
  type SlotChange,
  type StepKey,
} from '@/lib/configurator'
import type { ConfiguratorData } from '@/lib/configurator.server'
import { zl } from '@/lib/pricing/format'
import { priceFromSnapshot } from '@/lib/pricing/snapshot'
import type { Config, OptionType } from '@/lib/pricing/types'
import { readItem, storageKeys, writeItem } from '@/lib/storage'

import { Preview } from './Preview'
import { StepBar } from './StepBar'
import { StepCase, StepCooler } from './StepParts'
import { StepLevel } from './StepLevel'
import { StepMemory } from './StepMemory'
import { StepMonitor } from './StepMonitor'
import { StepSummary } from './StepSummary'
import { useConfigurator, type ConfiguratorView } from './view'

export type PricedData = ConfiguratorData & { prices: NonNullable<ConfiguratorData['prices']> }

type Props = {
  data: PricedData
  initial: ConfiguratorState
  /** Repairs of a broken address, shown once. */
  initialChanges: SlotChange[]
  /** The address carried a configuration: do not replace it with the stored one. */
  fromAddress: boolean
  /** Origin for the link in „Wyślij rodzicowi”. */
  siteUrl: string
}

/**
 * The configurator (spec. §7, board Konfigurator): six steps on the left, the preview on the right
 * (phone: a bar above the tab bar). All rules, prices and texts come from `lib/configurator` — the
 * components only draw them. The state lives in the address (`replaceState`, a link to send) and in
 * `localStorage` (back to the configuration later).
 */
export function Configurator({ data, initial, initialChanges, fromAddress, siteUrl }: Props) {
  const router = useRouter()
  const [state, setState] = useState(initial)
  const view = useConfigurator(data, state)
  // A repaired address: its message is there from the first paint (same text as a level change).
  const [notice, setNotice] = useState<string | null>(() =>
    initialChanges.length > 0 ? changeMessage(view, initialChanges) : null,
  )
  const [other, setOther] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const stepChanged = useRef(false)
  const restoring = useRef(false)
  const ctx = useMemo(() => ({ offer: data, builds: data.builds, prices: data.prices }), [data])

  // No configuration in the address: open the last one from this browser. Through the address, so
  // the server renders it like any shared link (and checks it the same way).
  useEffect(() => {
    if (fromAddress) return
    const stored = readItem(storageKeys.config)
    // Nothing stored, or the same as the start: stay (no reload, nothing to restore).
    if (!stored || stored === stateQuery(initial)) return
    restoring.current = true
    router.replace(`?${stored}`, { scroll: false })
    // Once, on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Address and storage follow the state (no new history entry per click).
  useEffect(() => {
    // Skip only the first run before a restore (the server renders the stored state next).
    if (restoring.current) {
      restoring.current = false
      return
    }
    const query = stateQuery(state)
    window.history.replaceState(null, '', `?${query}`)
    writeItem(storageKeys.config, query)
  }, [state])

  // A new step: move the focus to its heading (and the view to the top of the steps).
  useEffect(() => {
    if (!stepChanged.current) return
    stepChanged.current = false
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.closest('.cf')?.scrollIntoView({ block: 'start' })
  }, [state.step])

  const goTo = (step: StepKey) => {
    if (step === state.step) return
    stepChanged.current = true
    setNotice(null)
    setState((s) => ({ ...s, step }))
  }
  const stepIndex = STEPS.findIndex((s) => s.key === state.step)
  const next = STEPS[stepIndex + 1]
  const prev = STEPS[stepIndex - 1]
  const last = !next

  const setConfig = (config: Config) => setState((s) => ({ ...s, config }))
  const pickOption = (slot: OptionType, code: string) => {
    setNotice(null)
    setConfig({ ...state.config, [slot]: code })
  }
  const pickLevel = (code: string) => {
    if (code === state.config.level) return
    const result = switchLevel(state.config, code, ctx)
    if (!result) return
    setConfig(result.config)
    const level = data.levels.find((l) => l.code === code)
    setNotice(level ? levelChangeMessage(level.tierLabel, result, view.optionLabel) : null)
  }
  const takeBuild = (slug: string) => {
    const build = data.builds.find((b) => b.slug === slug)
    if (!build || priceFromSnapshot(build.config, data.prices) === null) return
    stepChanged.current = true
    setNotice(null)
    setState((s) => ({ ...s, config: build.config, step: 'poziom' }))
  }

  const match = buildMatch(state.config, data.builds, data.prices)
  const askHref = configInquiryHref(state.config, state.light, other)
  const color = `var(--c-${view.level.build})`

  return (
    <section
      className="cf"
      style={{ '--c': color, '--lc': view.lightColor } as CSSProperties}
      aria-labelledby="cf-h1"
    >
      <div className="wrap">
        <div className="cf-top">
          <div>
            <h1 id="cf-h1" className="h">
              Złóż swój komputer
            </h1>
            <p className="cf-lead">
              Wybierz moc, wygląd i pamięć. Cena przelicza się przy każdym kliknięciu i jest
              dokładnie taka, jak w naszych gotowych zestawach.
            </p>
          </div>
          <StepBar view={view} current={state.step} onGo={goTo} />
        </div>

        <div className="cf-grid">
          <div className="cf-main">
            {state.step === 'monitor' && (
              <StepMonitor
                headingRef={headingRef}
                data={data}
                state={state}
                onMonitor={(monitor) => setState((s) => ({ ...s, monitor }))}
                onGames={(games) => setState((s) => ({ ...s, games }))}
                onTake={takeBuild}
              />
            )}
            {state.step === 'poziom' && (
              <StepLevel headingRef={headingRef} data={data} state={state} onPick={pickLevel} />
            )}
            {state.step === 'obudowa' && (
              <StepCase
                headingRef={headingRef}
                data={data}
                state={state}
                view={view}
                onPick={(code) => pickOption('case', code)}
                onLight={(light) => setState((s) => ({ ...s, light }))}
              />
            )}
            {state.step === 'chlodzenie' && (
              <StepCooler
                headingRef={headingRef}
                data={data}
                state={state}
                view={view}
                onPick={(code) => pickOption('cooler', code)}
              />
            )}
            {state.step === 'pamiec' && (
              <StepMemory
                headingRef={headingRef}
                data={data}
                state={state}
                view={view}
                onPick={pickOption}
              />
            )}
            {state.step === 'podsumowanie' && (
              <StepSummary
                headingRef={headingRef}
                state={state}
                view={view}
                match={match}
                askHref={askHref}
                siteUrl={siteUrl}
                other={other}
                onOther={setOther}
                onLight={(light) => setState((s) => ({ ...s, light }))}
              />
            )}

            <div className="cf-nav">
              <Button variant="ghost" disabled={!prev} onClick={() => prev && goTo(prev.key)}>
                <IconArrow size={16} className="cf-back" />
                Wstecz
              </Button>
              {next ? (
                <Button onClick={() => goTo(next.key)}>
                  Dalej: {next.name}
                  <IconArrow size={16} />
                </Button>
              ) : (
                <ButtonLink href={askHref}>
                  Zapytaj o tę konfigurację
                  <IconArrow size={16} />
                </ButtonLink>
              )}
            </div>
          </div>

          <Preview
            state={state}
            view={view}
            match={match}
            last={last}
            askHref={askHref}
            onSummary={() => goTo('podsumowanie')}
          />
        </div>
      </div>

      {/* Phone (≤ 760 px): name, price and the next step above the tab bar (`stany/tel-07`). */}
      <div className="cf-mbar" role="region" aria-label="Cena i następny krok">
        <span>
          <small>{match?.sideName ?? view.build?.name}</small>
          <b>{zl(view.price)}</b>
        </span>
        {next ? (
          <Button onClick={() => goTo(next.key)}>Dalej: {next.name}</Button>
        ) : (
          <ButtonLink href={askHref}>Zapytaj o tę konfigurację</ButtonLink>
        )}
      </div>

      {/* Always in the DOM, so a screen reader announces a new message (board `.toast`). */}
      <div className="cf-toast-live" role="status">
        {notice && (
          <div className="cf-toast">
            <p>{notice}</p>
            <button type="button" aria-label="Zamknij komunikat" onClick={() => setNotice(null)}>
              <IconClose size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function changeMessage(view: ConfiguratorView, changes: SlotChange[]): string | null {
  return levelChangeMessage(view.level.tierLabel, { changes, keptChoice: true }, view.optionLabel)
}
