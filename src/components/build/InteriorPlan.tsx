'use client'

import { useState } from 'react'

import type { InteriorPart } from '@/lib/buildPage'

/** Number markers on the drawing (board Zestaw `.bns`), in part order. */
const MARKERS: [number, number][] = [
  [470, 256],
  [196, 112],
  [420, 34],
  [372, 104],
  [150, 222],
  [92, 66],
  [244, 414],
  [552, 70],
]

/**
 * „Co jest w środku” (spec. §6 pt 5, board Zestaw `.an7`): the plan drawing and eight parts as
 * buttons (`aria-pressed`). Picking a part highlights it on the drawing and shows what it gives
 * and the minimum we keep. The drawing repeats the buttons, so screen readers skip it.
 */
export function InteriorPlan({
  parts,
  air,
  code,
}: {
  parts: InteriorPart[]
  /** Air (tower) cooler instead of an AIO: a different drawing of part 3. */
  air: boolean
  /** „WAM-7” on the drawing. */
  code: string
}) {
  const [picked, setPicked] = useState(0)
  const current = parts[picked]
  if (!current) return null
  return (
    <div className="bp-plan__grid" data-part={picked}>
      <div className="bp-plan__view">
        <div className="bp-plan__frame">
          <PlanDrawing air={air} code={code} />
        </div>
        <div className="bp-plan__sel" aria-live="polite">
          <span className="bp-plan__n">{picked + 1}</span>
          <div>
            <small>{current.title}</small>
            <b>{current.value}</b>
            <p>{current.why}</p>
            <p className="bp-plan__min">
              <span>Minimum, którego pilnujemy:</span> {current.minimum}
            </p>
          </div>
        </div>
      </div>
      <ul className="bp-plan__list">
        {parts.map((part, i) => (
          <li key={part.title}>
            <button
              type="button"
              className="bp-part"
              aria-pressed={i === picked}
              onClick={() => setPicked(i)}
            >
              <span className="bp-plan__n">{i + 1}</span>
              <span className="bp-part__b">
                <small>{part.title}</small>
                <b>{part.value}</b>
                <span>{part.short}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The blueprint (board Zestaw `.bp6`, 620×520); `.pt-N` is part N, lit by `data-part`. */
function PlanDrawing({ air, code }: { air: boolean; code: string }) {
  return (
    <svg className="bp-draw" viewBox="0 0 620 520" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeOpacity=".07" />
        </pattern>
      </defs>
      <rect width="620" height="520" fill="url(#bp-grid)" />
      <g className="bp-draw__lines" fill="none" strokeLinejoin="round">
        <rect className="bp-draw__case" x="40" y="22" width="530" height="474" rx="14" />
        <path className="bp-draw__case" d="M52 398H558" strokeDasharray="6 6" />
        <g className="pt pt-7">
          <circle cx="505" cy="112" r="46" />
          <circle cx="505" cy="112" r="16" />
          <circle cx="505" cy="230" r="46" />
          <circle cx="505" cy="230" r="16" />
          <circle cx="505" cy="348" r="46" />
          <circle cx="505" cy="348" r="16" />
          <path d="M459 112h-6M459 230h-6M459 348h-6" />
        </g>
        <g className="pt pt-5">
          <rect x="88" y="62" width="320" height="320" rx="6" />
          <path d="M100 76h40M100 86h26M380 360h16" />
        </g>
        <g className="pt pt-1">
          <rect x="196" y="112" width="74" height="74" rx="4" />
          <rect x="212" y="128" width="42" height="42" />
        </g>
        {air ? (
          <g className="pt pt-2">
            <rect x="186" y="96" width="94" height="106" rx="6" />
            <path d="M196 110h74M196 124h74M196 138h74M196 152h74M196 166h74M196 180h74" />
          </g>
        ) : (
          <g className="pt pt-2">
            <rect x="120" y="32" width="300" height="24" rx="4" />
            <path d="M140 44h260" strokeDasharray="3 5" />
            <circle cx="233" cy="149" r="26" />
            <path d="M220 124C214 90 190 70 180 56M246 124C252 90 276 70 286 56" />
          </g>
        )}
        <g className="pt pt-3">
          <rect x="300" y="104" width="12" height="104" rx="2" />
          <rect x="318" y="104" width="12" height="104" rx="2" className="bp-draw__empty" />
          <rect x="336" y="104" width="12" height="104" rx="2" />
          <rect x="354" y="104" width="12" height="104" rx="2" className="bp-draw__empty" />
        </g>
        <g className="pt pt-4">
          <rect x="150" y="222" width="110" height="14" rx="2" />
          <path d="M262 229h8" />
        </g>
        <g className="pt pt-0">
          <rect x="96" y="256" width="372" height="66" rx="6" />
          <circle cx="170" cy="289" r="24" />
          <circle cx="282" cy="289" r="24" />
          <circle cx="394" cy="289" r="24" />
          <path d="M96 322v14h40" />
        </g>
        <g className="pt pt-6">
          <rect x="64" y="414" width="180" height="68" rx="5" />
          <circle cx="154" cy="448" r="22" />
          <path d="M244 430h24M244 448h24" />
        </g>
      </g>
      <g className="bp-draw__marks">
        {MARKERS.map(([x, y], i) => (
          <g key={i} className={`mk mk-${i}`} transform={`translate(${x} ${y})`}>
            <circle r="13" />
            <text y="4.5" textAnchor="middle">
              {i + 1}
            </text>
          </g>
        ))}
      </g>
      <text className="bp-draw__label" x="40" y="512">
        PLAN ISTOTY {code} SKALA 1:4
      </text>
    </svg>
  )
}
