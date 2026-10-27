import Image from 'next/image'
import Link from 'next/link'

import { Sigil } from '@/components/Sigil'
import { menuCreatures } from '@/lib/site'

/** "Napisz, w co grasz" (spec. §4 pt 13, board Main `.fin5`): 16 sigils under the old oak. */
export function FinalCta() {
  return (
    <section className="hm-sec hm-fin" aria-labelledby="fin-title">
      {/* The oak of the board as a static picture; its lightning flash is left out (decorative). */}
      <Image className="hm-fin__bg" src="/home/final-tree.svg" alt="" fill unoptimized />
      <div className="wrap hm-fin__in">
        <ul className="hm-fin__sigils" aria-hidden="true">
          {menuCreatures.map((c) => (
            <li key={c.slug} style={{ ['--c' as string]: `var(--c-${c.slug})` }}>
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
      </div>
    </section>
  )
}
