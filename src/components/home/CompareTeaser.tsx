import Link from 'next/link'

import type { CompareData } from '@/lib/home'

import { CompareChart } from './CompareChart'

/**
 * „Ile klatek kupujesz za dopłatę?” (spec. §4 pt 10, runda v2 §4.2): three creatures picked from
 * the data — each a visible step up — with the extra price and extra frames of every step.
 * Without numbers only the text and the button stay.
 */
export function CompareTeaser({ data }: { data: CompareData | null }) {
  return (
    <section className="hm-sec hm-cmp" id="porownaj-istoty" aria-labelledby="cmp-title">
      <div className="wrap hm-cmp__grid">
        <div>
          <h2 id="cmp-title" className="h" data-reveal="">
            Ile klatek kupujesz za dopłatę?
          </h2>
          <p className="hm-lead" data-reveal="">
            Trzy istoty obok siebie, każda o krok mocniejsza. Wybierz grę i monitor, a zobaczysz,
            ile kosztuje każdy krok i ile klatek daje. Dowolne istoty porównasz w porównywarce i
            wyślesz rodzicowi albo koledze jednym linkiem.
          </p>
          <div className="hm-cta">
            <Link className="btn" href="/porownaj">
              Otwórz porównywarkę
            </Link>
          </div>
        </div>
        {data && <CompareChart data={data} />}
      </div>
    </section>
  )
}
