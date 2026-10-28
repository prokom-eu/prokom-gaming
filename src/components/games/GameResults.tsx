'use client'

import { useState } from 'react'

import { HScroll } from '@/components/HScroll'
import { CreatureCardView } from '@/components/home/CreatureCard'
import { Segmented } from '@/components/ui/Segmented'
import { fpsText, RESOLUTIONS, RESOLUTION_LABELS, type Resolution } from '@/lib/fps'
import { gameLead, PICKER_DEFAULT_RESOLUTION, type GameInfo } from '@/lib/games'
import type { PickerData } from '@/lib/games.server'
import { panelRows } from '@/lib/home'

import { TierTable } from './TierTable'

/**
 * Header, „Polecamy na monitor {X}” and the tier table of one game (board KomputerDo). One client
 * island: the FullHD / 2K / 4K segments in the header switch both sections, with no request.
 */
export function GameResults({ data, game }: { data: PickerData; game: GameInfo }) {
  const [resolution, setResolution] = useState<Resolution>(PICKER_DEFAULT_RESOLUTION)
  const hasData = (r: Resolution) => data.panel.fps[r][0]?.some((v) => v !== null) ?? false
  const shown = hasData(resolution) ? resolution : (RESOLUTIONS.find(hasData) ?? resolution)
  const label = RESOLUTION_LABELS[shown]
  const rows = panelRows(data.panel, 0, shown)
  const picks = data.picks[shown][0] ?? []

  return (
    <>
      <header className="gm-head gm-head--game" data-scene-top>
        <div className="wrap">
          <h1 className="h">{`Komputer do ${game.name}`}</h1>
          <p className="gm-lead">{gameLead(game)}</p>
          <Segmented
            label="Rozdzielczość monitora"
            options={RESOLUTIONS.map((r) => ({
              value: r,
              label: RESOLUTION_LABELS[r],
              disabled: !hasData(r),
            }))}
            value={shown}
            onChange={setResolution}
          />
        </div>
      </header>

      <section className="gm-body gm-body--game" aria-labelledby="gm-picks">
        <div className="wrap">
          {picks.length > 0 && (
            <>
              <div className="gm-body__head">
                <h2 className="h" id="gm-picks">
                  Polecamy na monitor {label}
                </h2>
                <p>
                  Od najtańszego, który da płynną grę, po taki z zapasem na kolejne lata. Średnia
                  klatek z niezależnych testów, najwyższe ustawienia, bez skalowania.
                </p>
              </div>
              <HScroll as="ul" className="gm-cards" aria-label={`Polecane na monitor ${label}`}>
                {picks.map((p) => {
                  const card = data.cards[p.slug]
                  if (!card) return null
                  return (
                    <li key={p.tag}>
                      <span className="sr-only">{p.tag}: </span>
                      <CreatureCardView
                        card={card}
                        fps={{
                          label: `${game.name}, ${label}`,
                          text: fpsText(p.fps, game),
                          kind: p.kind,
                        }}
                      />
                    </li>
                  )
                })}
              </HScroll>
            </>
          )}

          <div className="gm-body__head gm-body__head--tiers">
            <h2 className="h">{game.name} na każdym poziomie mocy</h2>
            <p>Średnia liczba klatek. Kolor mówi, czy będzie płynnie (60 klatek i więcej).</p>
          </div>
          <TierTable rows={rows} />
        </div>
      </section>
    </>
  )
}
