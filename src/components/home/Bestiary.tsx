import Image from 'next/image'
import Link from 'next/link'

import { Sigil } from '@/components/Sigil'
import { SourceLabel } from '@/components/SourceLabel'
import { fpsText, RESOLUTION_LABELS, type GameScale } from '@/lib/fps'
import {
  bestiaryOrder,
  HERO_GAMES,
  homeTiers,
  TIER_HINTS,
  type HeroBuild,
  type HeroData,
  type PanelGame,
} from '@/lib/home'
import { zl } from '@/lib/pricing/format'

/**
 * "Szesnaście istot" (spec. §4 pt 4, board Main `.best5`): the power scale and 16 cards in price
 * order. A grid of four on desktop, a scrolling row on a phone. Without data only the text stays.
 */
export function Bestiary({ hero, games }: { hero: HeroData; games: readonly PanelGame[] }) {
  const cards = bestiaryOrder(hero.builds)
  const cyberpunk = games.find((g) => g.slug === CARD_GAME) ?? null
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
                <BestiaryCard build={build} game={cyberpunk} />
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

/** The game on every card (board Main): the same heavy title for all 16. */
const CARD_GAME = 'cyberpunk-2077'

function BestiaryCard({ build, game }: { build: HeroBuild; game: GameScale | null }) {
  const cyberpunk = build.fps[HERO_GAMES.findIndex((g) => g.slug === CARD_GAME)]
  return (
    <Link
      href={`/zestawy/${build.slug}`}
      className="hm-card"
      style={{ ['--c' as string]: `var(--c-${build.slug})` }}
    >
      <span className="hm-card__view" aria-hidden="true">
        {/* Fixed sizes (scene cropped by CSS, photo standing on the pedestal): a srcset of 1x/2x
            instead of every device width keeps 32 images from bloating the page HTML. */}
        <Image
          className="hm-card__scene"
          src={`/scenes/${build.key}-card.webp`}
          alt=""
          width={580}
          height={331}
        />
        <span className="hm-card__glow" />
        {build.photo && (
          <span className="hm-card__photo">
            <Image src={build.photo.src} alt="" width={240} height={273} />
          </span>
        )}
        <span className="hm-card__sigil">
          <Sigil id={build.key} size={46} />
        </span>
        <span className="hm-card__tier">
          Moc {build.tierRoman}
          <em>{build.tierLabel}</em>
        </span>
      </span>
      <span className="hm-card__body">
        <em className="lore">{build.epithet}</em>
        <strong className="nm">{build.name}</strong>
        {/* The tier above sits in the decorative (aria-hidden) picture: read it here. */}
        <span className="sr-only">
          Moc {build.tierRoman}, {build.tierLabel}.
        </span>
        <span className="hm-card__text">
          <b>{build.heroTitle}.</b> {build.heroText}
        </span>
        <span className="hm-card__foot">
          {cyberpunk && (
            <span className="hm-card__fps">
              Cyberpunk 2077, {RESOLUTION_LABELS[build.resolution]}
              <b>{game ? fpsText(cyberpunk.fps, game) : `${cyberpunk.fps} FPS`}</b>
              <SourceLabel kind={cyberpunk.kind} />
            </span>
          )}
          {build.price !== null && <span className="hm-card__price">{zl(build.price)}</span>}
        </span>
      </span>
    </Link>
  )
}
