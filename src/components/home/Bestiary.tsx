import Link from 'next/link'

import { bestiaryOrder, homeTiers, TIER_HINTS, type HeroData, type PanelGame } from '@/lib/home'

import { CREATURE_CARD_GAME, CreatureCard } from './CreatureCard'

/**
 * "Szesnaście istot" (spec. §4 pt 4, board Main `.best5`): the power scale and 16 cards in price
 * order. A grid of four on desktop, a scrolling row on a phone. Without data only the text stays.
 */
export function Bestiary({ hero, games }: { hero: HeroData; games: readonly PanelGame[] }) {
  const cards = bestiaryOrder(hero.builds)
  const cyberpunk = games.find((g) => g.slug === CREATURE_CARD_GAME) ?? null
  const tiers = homeTiers(hero)
  return (
    <section className="hm-sec hm-best" id="istoty" aria-labelledby="best-title">
      <div className="wrap">
        <div className="hm-head hm-head--row">
          <h2 id="best-title" className="h">
            Szesnaście istot.
            <br />
            Każda gra po swojemu.
          </h2>
          <p>
            Moc to procesor i karta graficzna, czyli to, co decyduje o klatkach. Od Skrzata, który
            pociągnie Robloxa, Minecrafta i CS2 w FullHD, po Peruna, który gra w 4K bez kompromisów.
            Każda istota ma swój charakter i swoje miejsce w dawnych podaniach.
          </p>
        </div>

        {tiers.length > 0 && (
          <ol className="hm-scale" aria-label="Skala mocy">
            {tiers.map((t) => (
              <li key={t.tier} style={{ ['--c' as string]: `var(--c-${t.lead})` }}>
                <b className="nm">
                  <span className="sr-only">Moc </span>
                  {t.roman}
                </b>
                <span>
                  {t.label}
                  <em>{TIER_HINTS[t.tier]}</em>
                </span>
              </li>
            ))}
          </ol>
        )}

        {cards.length > 0 && (
          <ul className="hm-best__grid">
            {cards.map((build) => (
              <li key={build.slug}>
                <CreatureCard build={build} game={cyberpunk} />
              </li>
            ))}
          </ul>
        )}

        <div className="hm-best__foot">
          <Link className="btn btn--ghost btn--lg" href="/zestawy">
            Wszystkie zestawy z filtrami
          </Link>
          {/* TODO(krystian): the board says "Klatki przykładowe, zdjęcia poglądowe. Przed startem
              zastąpią je pomiary z naszego serwisu." — the numbers already come from tests and carry
              their source, so only the photo note stays (decision 27.10.2026, like the hero). */}
          <span>Zdjęcia poglądowe.</span>
        </div>
      </div>
    </section>
  )
}
