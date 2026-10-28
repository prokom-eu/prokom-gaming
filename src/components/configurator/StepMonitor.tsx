import type { CSSProperties, RefObject } from 'react'

import { Sigil } from '@/components/Sigil'
import { IconArrow } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { hasHeavyGame, MONITORS, recommendation, type ConfiguratorState } from '@/lib/configurator'
import { RESOLUTION_LABELS, type Resolution } from '@/lib/fps'
import { zl } from '@/lib/pricing/format'
import { lookupPrice } from '@/lib/pricing/snapshot'

import type { PricedData } from './Configurator'

/** Step 1 (board `show0`): monitor, games, the recommended level. */
export function StepMonitor({
  headingRef,
  data,
  state,
  onMonitor,
  onGames,
  onTake,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
  data: PricedData
  state: ConfiguratorState
  onMonitor: (monitor: Resolution) => void
  onGames: (games: string[]) => void
  onTake: (build: string) => void
}) {
  const kinds = Object.fromEntries(data.games.map((g) => [g.slug, g.kind]))
  const reco = recommendation(state.monitor, hasHeavyGame(state.games, kinds))
  const build = data.builds.find((b) => b.slug === reco.build)
  const level = data.levels.find((l) => l.build === reco.build)
  const from = level ? lookupPrice(data.prices.levelFrom, level.code) : undefined

  const toggle = (slug: string) =>
    onGames(
      state.games.includes(slug) ? state.games.filter((g) => g !== slug) : [...state.games, slug],
    )

  return (
    <div className="cf-step">
      <h2 ref={headingRef} tabIndex={-1} className="h">
        Na czym grasz i w co?
      </h2>
      <p className="cf-mut">Podpowiemy poziom mocy. Możesz to pominąć i wybrać sam.</p>

      <h3 className="cf-lbl" id="cf-mon">
        Monitor
      </h3>
      <div className="cf-mons" role="group" aria-labelledby="cf-mon">
        {MONITORS.map((m) => (
          <button
            key={m.resolution}
            type="button"
            className="cf-mon"
            aria-pressed={state.monitor === m.resolution}
            onClick={() => onMonitor(m.resolution)}
          >
            <b>{RESOLUTION_LABELS[m.resolution]}</b>
            <span>{m.note}</span>
          </button>
        ))}
      </div>

      <h3 className="cf-lbl" id="cf-games">
        Gry, w które grasz najczęściej
      </h3>
      <div className="cf-chips" role="group" aria-labelledby="cf-games">
        {data.games.map((g) => (
          <Chip key={g.slug} pressed={state.games.includes(g.slug)} onClick={() => toggle(g.slug)}>
            {g.name}
          </Chip>
        ))}
      </div>

      {build && level && (
        <div
          className="cf-reco cut"
          style={{ '--rc': `var(--c-${build.slug})` } as CSSProperties}
          aria-live="polite"
        >
          <div className="cf-reco__t">
            <span className="cf-reco__k">Polecamy</span>
            <span className="cf-reco__name">
              <span className="cf-reco__sigil" aria-hidden="true">
                <Sigil id={build.key} size={34} />
              </span>
              <b className="nm">{build.name}</b>
            </span>
            <em>
              {level.tierLabel} · {level.cpu} + {level.gpu}
            </em>
            <span className="cf-reco__why">{reco.why}</span>
          </div>
          <div className="cf-reco__r">
            {from !== undefined && (
              <span className="cf-reco__p">
                od <b>{zl(from)}</b>
              </span>
            )}
            <Button onClick={() => onTake(build.slug)}>
              Ustaw i przejdź dalej
              <IconArrow size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
