import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { cache } from 'react'

import { GameResults } from '@/components/games/GameResults'
import { RequirementsBox } from '@/components/games/InfoBoxes'
import { getEnv } from '@/lib/env'
import { gameJsonLd, gameLead, gamePath, gameTitle, hasRequirements } from '@/lib/games'
import { loadGamePage } from '@/lib/games.server'

import '@/components/games/games.css'

type Props = { params: Promise<{ gra: string }> }

// One read per request for both the metadata and the page.
const load = cache(loadGamePage)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const data = await load((await params).gra)
  if (!data) return {}
  return {
    // Spec. §23: the template already ends with the brand — no layout suffix.
    title: { absolute: gameTitle(data.game.name) },
    description: gameLead(data.game),
    alternates: { canonical: new URL(gamePath(data.game.slug), getEnv().SITE_URL).toString() },
  }
}

/**
 * „Komputer do {gry}” (spec. §8, boards KomputerDo / KomputerDo-telefon): 33 pages from data.
 * Rendered per request like the rest of the site (the image build has no database — decision of
 * 28.10, static rendering with the cache in G15). An unknown slug or a game without its page → 404.
 */
export default async function GamePage({ params }: Props) {
  await connection()
  const data = await load((await params).gra)
  if (!data) notFound()
  const { game } = data
  const jsonLd = gameJsonLd({
    siteUrl: getEnv().SITE_URL,
    slug: game.slug,
    name: game.name,
    faq: data.faq,
  })
  const requirements = hasRequirements(game.requirements) ? game.requirements : null

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD as Next recommends: `<` escaped, so no text can close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <GameResults data={data} game={game} />

      <section className="gm-more" aria-label="Wymagania i pytania">
        <div className="wrap">
          <div className={requirements ? 'gm-info' : 'gm-info gm-info--faq'}>
            {requirements && <RequirementsBox requirements={requirements} className="gm-box" />}
            <div className="gm-faq">
              <h3 className="h">O co pytają gracze</h3>
              {data.faq.map((q, i) => (
                <details key={q.question} open={i === 0}>
                  <summary>{q.question}</summary>
                  <p>{q.answer}</p>
                </details>
              ))}
            </div>
          </div>

          {data.others.length > 0 && (
            <nav className="gm-others" aria-labelledby="gm-others">
              <h3 className="h" id="gm-others">
                Inne gry
              </h3>
              <ul>
                {data.others.map((g) => (
                  <li key={g.slug}>
                    <Link className="chip" href={gamePath(g.slug)}>
                      Komputer do {g.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </section>
    </>
  )
}
