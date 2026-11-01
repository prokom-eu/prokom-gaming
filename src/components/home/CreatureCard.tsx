import Image from 'next/image'
import Link from 'next/link'

import { Sigil } from '@/components/Sigil'
import { SourceLabel } from '@/components/SourceLabel'
import { fpsText, RESOLUTION_LABELS, type FpsKind, type GameScale } from '@/lib/fps'
import { HERO_GAMES, type HeroBuild } from '@/lib/home'
import { zl } from '@/lib/pricing/format'

import './creature-card.css'

/** The game on every card (board Main): the same heavy title for all 16. */
export const CREATURE_CARD_GAME = 'cyberpunk-2077'

/** What the card shows about a creature (public fields only). */
export type CreatureCardData = {
  slug: string
  key: string
  name: string
  epithet: string
  heroTitle: string
  heroText: string
  tierRoman: string
  tierLabel: string
  price: number | null
  photo: { src: string; alt: string } | null
}

/** The number in the card's footer: „Cyberpunk 2077, 2K”, „126 FPS” and its source. */
export type CreatureCardFps = { label: string; text: string; kind: FpsKind }

/**
 * Creature card (board Main `.bc`): 16 on the home page, neighbours on a build page, the picks on
 * a game page (board KomputerDo). The game in the footer is the caller's choice.
 */
export function CreatureCardView({
  card,
  fps,
  eager = false,
}: {
  card: CreatureCardData
  fps: CreatureCardFps | null
  /** Above the fold (the first card of a game page): loaded at once, the scene first. */
  eager?: boolean
}) {
  return (
    <Link
      href={`/zestawy/${card.slug}`}
      className="hm-card"
      style={{ ['--c' as string]: `var(--c-${card.slug})` }}
    >
      <span className="hm-card__view" aria-hidden="true">
        {/* Fixed sizes (scene cropped by CSS, photo standing on the pedestal): a srcset of 1x/2x
            instead of every device width keeps 32 images from bloating the page HTML. */}
        <Image
          className="hm-card__scene"
          src={`/scenes/${card.key}-card.webp`}
          alt=""
          width={580}
          height={331}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
        />
        <span className="hm-card__glow" />
        {card.photo && (
          <span className="hm-card__photo">
            <Image
              src={card.photo.src}
              alt=""
              // Drawn ~175 px wide (60% of the 330 px view, `height: 100%`): 180 gives a 384 px
              // 2x variant instead of 640 px (Lighthouse G15). Same aspect as before (240×273).
              width={180}
              height={205}
              loading={eager ? 'eager' : 'lazy'}
            />
          </span>
        )}
        <span className="hm-card__sigil">
          <Sigil id={card.key} size={46} />
        </span>
        <span className="hm-card__tier">
          Moc {card.tierRoman}
          <em>{card.tierLabel}</em>
        </span>
      </span>
      <span className="hm-card__body">
        <em className="lore">{card.epithet}</em>
        <strong className="nm">{card.name}</strong>
        {/* The tier above sits in the decorative (aria-hidden) picture: read it here. */}
        <span className="sr-only">
          Moc {card.tierRoman}, {card.tierLabel}.
        </span>
        <span className="hm-card__text">
          <b>{card.heroTitle}.</b> {card.heroText}
        </span>
        <span className="hm-card__foot">
          {fps && (
            <span className="hm-card__fps">
              {fps.label}
              <b>{fps.text}</b>
              <SourceLabel kind={fps.kind} />
            </span>
          )}
          {card.price !== null && <span className="hm-card__price">{zl(card.price)}</span>}
        </span>
      </span>
    </Link>
  )
}

/** Creature card with Cyberpunk 2077 at the build's own resolution (home page, build page). */
export function CreatureCard({ build, game }: { build: HeroBuild; game: GameScale | null }) {
  const cyberpunk = build.fps[HERO_GAMES.findIndex((g) => g.slug === CREATURE_CARD_GAME)]
  return (
    <CreatureCardView
      card={build}
      fps={
        cyberpunk
          ? {
              label: `Cyberpunk 2077, ${RESOLUTION_LABELS[build.resolution]}`,
              text: game ? fpsText(cyberpunk.fps, game) : `${cyberpunk.fps} FPS`,
              kind: cyberpunk.kind,
            }
          : null
      }
    />
  )
}
