import Image from 'next/image'
import Link from 'next/link'

import { Sigil } from '@/components/Sigil'
import { SourceLabel } from '@/components/SourceLabel'
import { fpsText, RESOLUTION_LABELS, type GameScale } from '@/lib/fps'
import { HERO_GAMES, type HeroBuild } from '@/lib/home'
import { zl } from '@/lib/pricing/format'

import './creature-card.css'

/** The game on every card (board Main): the same heavy title for all 16. */
export const CREATURE_CARD_GAME = 'cyberpunk-2077'

/** Creature card: 16 on the home page, neighbours on a build page. */
export function CreatureCard({ build, game }: { build: HeroBuild; game: GameScale | null }) {
  const cyberpunk = build.fps[HERO_GAMES.findIndex((g) => g.slug === CREATURE_CARD_GAME)]
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
