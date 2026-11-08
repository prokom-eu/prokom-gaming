import type { CSSProperties, RefObject } from 'react'

import { Sigil } from '@/components/Sigil'
import {
  fpsCell,
  shortGameName,
  shownGames,
  TIER_NOTES,
  tierRows,
  type ConfiguratorState,
} from '@/lib/configurator'
import { IconEye } from '@/components/icons'
import { sourceOf, type FpsKind } from '@/lib/fps'
import { zl } from '@/lib/pricing/format'

import type { PricedData } from './Configurator'

/**
 * Step 2 (board `show1`): nine tier rows, variants as pills, the „od” price, FPS in the chosen games
 * at the chosen monitor and „Poziom wyżej”. A level change keeps the choice (`switchLevel`).
 */
export function StepLevel({
  headingRef,
  data,
  state,
  onPick,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
  data: PricedData
  state: ConfiguratorState
  onPick: (level: string) => void
}) {
  const games = shownGames(state.games)
  const gameName = new Map(data.games.map((g) => [g.slug, g.name]))
  const levels = new Map(data.levels.map((l) => [l.code, l]))
  const builds = new Map(data.builds.map((b) => [b.slug, b]))
  const rows = tierRows({
    levels: data.levels,
    current: state.config.level,
    games,
    monitor: state.monitor,
    fps: data.fps,
    levelFrom: data.prices.levelFrom,
  })

  return (
    <div className="cf-step">
      <h2 ref={headingRef} tabIndex={-1} className="h">
        Poziom mocy
      </h2>
      <p className="cf-mut">
        Procesor i karta graficzna, razem z płytą i zasilaczem dobranymi do nich. To one decydują o
        klatkach. Ceny „od” obejmują cały komputer.
      </p>

      <ul className="cf-tiers">
        {rows.map((row) => {
          const shown = levels.get(row.shown)!
          const build = builds.get(shown.build)
          return (
            <li
              key={row.tier}
              className={row.selected ? 'cf-tier is-on' : 'cf-tier'}
              style={{ '--tc': `var(--c-${shown.build})` } as CSSProperties}
            >
              <div className="cf-tier__h">
                <div className="cf-tier__n">
                  <b>{shown.tierLabel}</b>
                  <span>{TIER_NOTES[row.tier]}</span>
                </div>
                {row.levels.length > 1 && (
                  <div
                    className="cf-tier__v"
                    role="group"
                    aria-label={`Wariant: ${shown.tierLabel}`}
                  >
                    {row.levels.map((code) => {
                      const l = levels.get(code)!
                      const on = code === state.config.level
                      return (
                        <button
                          key={code}
                          type="button"
                          className={!row.selected && code === row.shown ? 'is-pre' : undefined}
                          aria-pressed={on}
                          style={{ '--vc': `var(--c-${l.build})` } as CSSProperties}
                          onClick={() => onPick(code)}
                        >
                          {l.variant || builds.get(l.build)?.name}
                        </button>
                      )
                    })}
                  </div>
                )}
                {row.from !== null && (
                  <div className="cf-tier__p">
                    <span>od</span>
                    <b>{zl(row.from)}</b>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="cf-tier__b"
                aria-pressed={row.selected}
                onClick={() => onPick(shown.code)}
              >
                <span className="cf-tier__sigil" aria-hidden="true">
                  {build && <Sigil id={build.key} size={46} />}
                </span>
                <span className="cf-tier__m">
                  <b className="nm">{build?.name}</b>
                  <span>
                    {shown.cpu} + {shown.gpu}
                  </span>
                  <small>
                    {shown.mobo}, {shown.psu}
                  </small>
                </span>
                <span className="cf-tier__f">
                  {games.map((slug) => {
                    const cell = fpsCell(data.fps, shown.build, slug, state.monitor)
                    const name = gameName.get(slug) ?? slug
                    return (
                      <span key={slug} className="cf-fp">
                        <i>{shortGameName(name)}</i>
                        <b>{cell ? cell.fps : '—'}</b>
                        {cell && <SourceDot kind={cell.kind} />}
                      </span>
                    )
                  })}
                </span>
                <span className="cf-tier__up">{row.upgrade}</span>
                <span className="cf-tier__ok">{row.selected ? 'Wybrany' : 'Wybierz'}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="cf-fine">
        <IconEye size={16} />
        Klatki: średnia z niezależnych testów (TechPowerUp, ComputerBase) przy najwyższych
        ustawieniach, bez skalowania; gdzie testu brak, nasz szacunek. GeForce: DLSS 4 i lepszy ray
        tracing. Radeon: więcej mocy i pamięci za tę samą cenę.
      </p>
    </div>
  )
}

/**
 * Source of a number on a narrow tile: the dot of `SourceLabel` with its label for screen readers
 * and as a tooltip (ADR-G004 — every number has its source; the tile has no room for the text).
 */
function SourceDot({ kind }: { kind: FpsKind }) {
  const { label, tone } = sourceOf(kind)
  return (
    <span className={`cf-srcdot src--${tone}`} title={label}>
      <i aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
