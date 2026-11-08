import Link from 'next/link'

import { SourceLabel } from '@/components/SourceLabel'
import { smoothText } from '@/lib/games'
import type { PanelRow } from '@/lib/home'

/**
 * „Wszystkie poziomy mocy w {X}” (boards Gra `.gt`, KomputerDo): nine tiers, the lead build's
 * number, „płynnie” from 60 / „poniżej 60” (spec. §8) and the source. The board hides the source
 * on a phone — here it stays under the number: no number without its label (ADR-G004 §6).
 */
export function TierTable({ rows }: { rows: readonly PanelRow[] }) {
  return (
    <ul className="gm-tiers">
      {rows.map((row) => {
        const smooth = smoothText(row.fps)
        return (
          <li key={row.tier} style={{ ['--c' as string]: `var(--c-${row.lead})` }}>
            <Link href={`/zestawy/${row.lead}`} className="gm-tier">
              <span className="gm-tier__name">
                <b>Moc {row.roman}</b>
                <span>{row.names}</span>
              </span>
              <span className="gm-tier__bar" aria-hidden="true">
                <s style={{ width: `${row.percent}%` }} />
              </span>
              <b className="gm-tier__value">{row.text}</b>
              <span
                className={`gm-tier__state${smooth === 'płynnie' ? '' : ' gm-tier__state--low'}`}
              >
                {smooth}
              </span>
              <span className="gm-tier__src">
                <SourceLabel kind={row.kind} />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
