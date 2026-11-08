import Link from 'next/link'
import type { CSSProperties } from 'react'

import { Sigil } from '@/components/Sigil'
import { menuCreatures } from '@/lib/site'

/** Quick ways in for the three most asked-about games (runda v2 §4.4): their „Komputer do…” page. */
const QUICK_GAMES = [
  { slug: 'counter-strike-2', label: 'CS2' },
  { slug: 'fortnite', label: 'Fortnite' },
  { slug: 'minecraft', label: 'Minecraft' },
] as const

/** Half the angle of the arc of sigils, in degrees (16 sigils from −SPAN to +SPAN). */
const SPAN = 56

/**
 * „Napisz, w co grasz” (spec. §4 pt 13, runda v2 §4.4): a strong close — 16 sigils in an arc with
 * a glow in their colours under a night sky (CSS only, no picture: the old oak was the empty grey
 * shape), the two calls to action and three quick ways into a game. Phone: sigils in two rows.
 */
export function FinalCta() {
  const last = menuCreatures.length - 1
  return (
    <section className="hm-sec hm-fin" id="napisz" aria-labelledby="fin-title">
      <span className="hm-fin__sky" aria-hidden="true" />
      <div className="wrap hm-fin__in">
        <ul className="hm-fin__sigils" aria-hidden="true">
          {menuCreatures.map((c, i) => (
            <li
              key={c.slug}
              style={
                {
                  '--c': `var(--c-${c.slug})`,
                  '--a': `${(last === 0 ? 0 : -SPAN + (2 * SPAN * i) / last).toFixed(2)}deg`,
                } as CSSProperties
              }
            >
              <Sigil id={c.id} size={46} />
            </li>
          ))}
        </ul>
        <h2 id="fin-title" className="h">
          Napisz, w co grasz
        </h2>
        <p className="hm-lead">
          Szesnaście istot czeka. Dobierzemy tę właściwą i odpiszemy z imienną listą części, ceną i
          terminem. Zwykle w ciągu godziny, codziennie od 8 do 22.
        </p>
        <div className="hm-cta">
          <Link className="btn btn--lg" href="/konfigurator">
            Dobierz komputer
          </Link>
          <Link className="btn btn--ghost btn--lg" href="/kontakt">
            Zadaj pytanie
          </Link>
        </div>
        <ul className="hm-fin__quick" aria-label="Szybko do gry">
          {QUICK_GAMES.map((g) => (
            <li key={g.slug}>
              <Link className="chip" href={`/komputer-do/${g.slug}`}>
                Gram w {g.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
