'use client'

import Link from 'next/link'
import { useState } from 'react'

import { SourceLabel } from '@/components/SourceLabel'
import { Segmented } from '@/components/ui/Segmented'
import { RESOLUTIONS, RESOLUTION_LABELS, type Resolution } from '@/lib/fps'
import {
  PANEL_DEFAULT_GAME,
  PANEL_DEFAULT_RESOLUTION,
  panelRows,
  type GamesPanelData,
} from '@/lib/home'

/**
 * Games and the FPS of all nine tiers for the picked game and resolution (spec. §4 pt 6, board
 * Main `.games`). Everything is in `data` — switching is instant, no request.
 */
export function GamesPanel({ data }: { data: GamesPanelData }) {
  const [game, setGame] = useState(() =>
    Math.max(
      0,
      data.games.findIndex((g) => g.slug === PANEL_DEFAULT_GAME),
    ),
  )
  const [resolution, setResolution] = useState<Resolution>(PANEL_DEFAULT_RESOLUTION)

  const hasData = (r: Resolution) => data.fps[r][game]?.some((v) => v !== null) ?? false
  // A game without numbers at the chosen resolution falls back to the first that has them. The
  // choice itself stays in state on purpose: back on a game with data, the user's pick returns.
  const shown = hasData(resolution) ? resolution : (RESOLUTIONS.find(hasData) ?? resolution)
  const rows = panelRows(data, game, shown)
  const current = data.games[game]
  const setting = data.settings[game]

  return (
    <>
      <div className="hm-games__chips" role="group" aria-label="Gra">
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

      <div className="hm-games__panel cut">
        <div className="hm-games__head">
          <div>
            <h3 className="h">{current?.name}</h3>
            {setting && <p>{setting}</p>}
          </div>
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
        <ul className="hm-games__rows">
          {rows.map((row) => (
            <li key={row.tier} style={{ ['--c' as string]: `var(--c-${row.lead})` }}>
              <Link href={`/zestawy/${row.lead}`} className="hm-games__row">
                <span className="hm-games__tier">
                  <b>Moc {row.roman}</b>
                  <span>{row.names}</span>
                </span>
                <span className="hm-games__bar" aria-hidden="true">
                  <s style={{ width: `${row.percent}%` }} />
                </span>
                <span className="hm-games__value">
                  <b>{row.text}</b>
                  <SourceLabel kind={row.kind} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="hm-games__legend">
          <span className="src src--pk">
            <i aria-hidden="true" />
            Zmierzone w PRO-KOM
          </span>
          <span className="src src--ind">
            <i aria-hidden="true" />
            Test niezależny albo przeliczone z testów, ze źródłem
          </span>
          <span className="src src--est">
            <i aria-hidden="true" />
            Szacunek (brak testu z naszą kartą)
          </span>
        </p>
        {current && (
          <Link className="btn" href={`/komputer-do/${current.slug}`}>
            Pełne wyniki dla tej gry
          </Link>
        )}
      </div>
    </>
  )
}
