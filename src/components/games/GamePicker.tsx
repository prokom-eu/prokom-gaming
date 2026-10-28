'use client'

import { useEffect, useState } from 'react'

import { HScroll } from '@/components/HScroll'
import { Segmented } from '@/components/ui/Segmented'
import { fpsText, RESOLUTIONS, RESOLUTION_LABELS, type Resolution } from '@/lib/fps'
import { pickerQuery, type PickerState } from '@/lib/games'
import type { PickerData } from '@/lib/games.server'
import { panelRows } from '@/lib/home'

import { ColorsBox, NumbersBox, RequirementsBox } from './InfoBoxes'
import { PickCard } from './PickCard'
import { TierTable } from './TierTable'

/**
 * „Dobór pod grę” (spec. §8, boards Gra / Gra-telefon, `stany/tel-09`, `tel-10`). Everything for
 * the 33 games is in `data`: switching is instant, the address follows (`?gra=&rozdz=`) so the
 * view can be sent as a link.
 */
export function GamePicker({ data, initial }: { data: PickerData; initial: PickerState }) {
  const [game, setGame] = useState(() =>
    Math.max(
      0,
      data.games.findIndex((g) => g.slug === initial.game),
    ),
  )
  const [resolution, setResolution] = useState<Resolution>(initial.resolution)

  const current = data.games[game]
  const hasData = (r: Resolution) => data.panel.fps[r][game]?.some((v) => v !== null) ?? false
  // A game without numbers at the chosen resolution shows the first that has them (as on the home
  // page); the choice itself stays, so it returns on a game with data.
  const shown = hasData(resolution) ? resolution : (RESOLUTIONS.find(hasData) ?? resolution)
  const rows = panelRows(data.panel, game, shown)
  const picks = data.picks[shown][game] ?? []

  useEffect(() => {
    if (!current) return
    const query = pickerQuery({ game: current.slug, resolution: shown })
    if (window.location.search !== query) window.history.replaceState(null, '', query)
  }, [current, shown])

  if (!current) return null

  return (
    <>
      <header className="gm-head" data-scene-top>
        <div className="wrap">
          <h1 className="h">{`Komputer do ${current.name}`}</h1>
          <p className="gm-lead">
            Wybierz grę i monitor. Pokażemy klatki w każdym poziomie mocy, trzy zestawy, które mają
            sens, i to, skąd pochodzi każdy wynik.
          </p>
          <div className="gm-chips" role="group" aria-label="Gra">
            {data.games.map((g, i) => (
              <button
                key={g.slug}
                type="button"
                className="chip"
                aria-pressed={i === game}
                onClick={() => setGame(i)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="gm-body" aria-labelledby="gm-game">
        <div className="wrap">
          <div className="gm-body__head">
            <h2 className="h" id="gm-game">
              {current.name}
            </h2>
            <Segmented
              label="Rozdzielczość"
              options={RESOLUTIONS.map((r) => ({
                value: r,
                label: RESOLUTION_LABELS[r],
                disabled: !hasData(r),
              }))}
              value={shown}
              onChange={setResolution}
            />
          </div>

          {picks.length > 0 && (
            <HScroll className="gm-picks" aria-label="Polecane zestawy">
              {picks.map((p) => {
                const card = data.cards[p.slug]
                if (!card) return null
                return (
                  <PickCard
                    key={p.tag}
                    tag={p.tag}
                    card={card}
                    fpsText={fpsText(p.fps, current)}
                    kind={p.kind}
                  />
                )
              })}
            </HScroll>
          )}

          <h3 className="h gm-tiers__title">Wszystkie poziomy mocy w {RESOLUTION_LABELS[shown]}</h3>
          <TierTable rows={rows} />

          <div className="gm-boxes">
            {current.requirements && <RequirementsBox requirements={current.requirements} />}
            <NumbersBox note={current.settingNote} />
            <ColorsBox />
          </div>
        </div>
      </section>
    </>
  )
}
