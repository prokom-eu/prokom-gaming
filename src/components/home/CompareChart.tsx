'use client'

import { useEffect, useRef, useState } from 'react'

import { CasePhoto } from '@/components/CasePhoto'
import { Sigil } from '@/components/Sigil'
import { Count } from '@/components/motion/Count'
import { SourceLabel } from '@/components/SourceLabel'
import { Segmented } from '@/components/ui/Segmented'
import { RESOLUTION_LABELS, type Resolution } from '@/lib/fps'
import { compareStepText, type CompareData } from '@/lib/home'
import { prefersReducedMotion } from '@/lib/motion'
import { zl } from '@/lib/pricing/format'

/**
 * The comparison of three creatures (runda v2 §4.2): game and resolution switch without a reload,
 * bars in the creature's colour grow once when the chart comes into view (static with reduced
 * motion: CSS), every number keeps its source label.
 */
export function CompareChart({ data }: { data: CompareData }) {
  const initial = data.views[data.initial]
  const [game, setGame] = useState(initial.game)
  const [resolution, setResolution] = useState<Resolution>(initial.resolution)
  const chart = useRef<HTMLElement>(null)

  // The growth is presentation only, so it lives on the element, not in state. The server HTML
  // draws full bars: without JavaScript nothing is lost.
  useEffect(() => {
    const el = chart.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    // Already on screen: no growth (it would flash). Below the fold: hide, then grow into view.
    if (el.getBoundingClientRect().top < window.innerHeight) return
    if (prefersReducedMotion()) return
    el.dataset.shown = 'false'
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.shown = 'true'
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const games = [...new Map(data.views.map((v) => [v.game, v.gameName]))]
  const hasView = (g: string, r: Resolution) =>
    data.views.some((v) => v.game === g && v.resolution === r)
  // A game without a trio at the chosen resolution falls back to its first one that has it.
  const shownResolution = hasView(game, resolution)
    ? resolution
    : (data.views.find((v) => v.game === game)?.resolution ?? resolution)
  const view =
    data.views.find((v) => v.game === game && v.resolution === shownResolution) ?? initial

  return (
    <figure ref={chart} className="hm-cmp__chart">
      <div className="hm-cmp__controls">
        <div className="hm-cmp__games" role="group" aria-label="Gra do porównania">
          {games.map(([slug, name]) => (
            <button
              key={slug}
              type="button"
              className="chip"
              aria-pressed={slug === game}
              onClick={() => setGame(slug)}
            >
              {name}
            </button>
          ))}
        </div>
        <Segmented
          label="Rozdzielczość do porównania"
          options={(['fullhd', 'qhd', 'uhd'] as const).map((r) => ({
            value: r,
            label: RESOLUTION_LABELS[r],
            disabled: !hasView(game, r),
          }))}
          value={shownResolution}
          onChange={setResolution}
        />
      </div>
      <ul>
        {view.cards.map((card) => (
          <li key={card.slug} style={{ ['--c' as string]: `var(--c-${card.slug})` }}>
            <span className="hm-cmp__stage" aria-hidden="true">
              <span className="hm-cmp__glow" />
              {card.photo && <CasePhoto photo={card.photo} drawnWidth={150} />}
            </span>
            <span className="hm-cmp__sigil" aria-hidden="true">
              <Sigil id={card.key} ring={false} size={28} />
            </span>
            <strong className="nm">{card.name}</strong>
            <span className="hm-cmp__tier">
              Moc {card.tierRoman}, {card.tierLabel}
            </span>
            <span className="hm-cmp__price">{zl(card.price)}</span>
            <span className="hm-cmp__bar" aria-hidden="true">
              <s style={{ ['--k' as string]: card.percent / 100 }} />
            </span>
            <b>
              <Count value={card.fps} /> FPS
            </b>
            <SourceLabel kind={card.kind} />
            <em>{card.step ? compareStepText(card.step) : 'punkt wyjścia'}</em>
          </li>
        ))}
      </ul>
      {/* Read out after a switch: which game, monitor and setting the bars now show. */}
      <figcaption aria-live="polite">
        {view.gameName}, {RESOLUTION_LABELS[view.resolution]}, {view.setting}. Każda kolejna istota
        daje co najmniej 15% więcej klatek od poprzedniej.
      </figcaption>
    </figure>
  )
}
