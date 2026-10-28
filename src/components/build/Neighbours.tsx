import Link from 'next/link'

import { CREATURE_CARD_GAME, CreatureCard } from '@/components/home/CreatureCard'
import type { BuildPageData } from '@/lib/buildPage.server'
import { routes } from '@/lib/nav'

/**
 * „Inne istoty w pobliżu” (spec. §6 pt 12, board `.nr7`): the same creature cards as the home
 * page — the same tier or one up. Phone: a row that scrolls sideways (ADR-G003 §4).
 */
export function Neighbours({ data }: { data: BuildPageData }) {
  if (data.neighbours.length === 0) return null
  const game = data.fps.games.find((g) => g.slug === CREATURE_CARD_GAME) ?? null
  return (
    <section className="bp-near" aria-labelledby="bp-near-h">
      <div className="wrap">
        <div className="bp-sh">
          <h2 id="bp-near-h" className="h">
            Inne istoty w pobliżu
          </h2>
          <p>Ta sama moc w innym charakterze albo krok wyżej, jeśli chcesz więcej zapasu.</p>
        </div>
        <ul className="bp-near__list">
          {data.neighbours.map((build) => (
            <li key={build.slug}>
              <CreatureCard build={build} game={game} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** „Pytania o {istotę}” (spec. §6 pt 13): nine questions from `faq` (group `build`). */
export function BuildFaq({ data }: { data: BuildPageData }) {
  if (data.faq.length === 0) return null
  return (
    <section className="bp-faq" aria-labelledby="bp-faq-h">
      <div className="wrap bp-faq__in">
        <h2 id="bp-faq-h" className="h">
          Pytania o {data.build.accusative}
        </h2>
        {data.faq.map((q, i) => (
          <details key={q.id} open={i === 0}>
            <summary>
              {q.question}
              <i aria-hidden="true" />
            </summary>
            <p>{q.answer}</p>
          </details>
        ))}
        <p className="bp-faq__more">
          Inne pytania?{' '}
          <Link className="lnk" href={routes.faq}>
            Wszystkie pytania i odpowiedzi
          </Link>
        </p>
      </div>
    </section>
  )
}
