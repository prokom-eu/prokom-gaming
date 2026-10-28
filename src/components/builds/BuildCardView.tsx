import Image from 'next/image'
import Link from 'next/link'

import { IconArrow } from '@/components/icons'
import { SourceLabel } from '@/components/SourceLabel'
import type { BuildCard } from '@/lib/builds'
import { buildHref } from '@/lib/nav'
import { zl } from '@/lib/pricing/format'

/**
 * One card of „Wszystkie zestawy” (board Zestawy `.zc`): scene with the case on the pedestal,
 * tier, name, one line, parts, Cyberpunk FPS with its source, price and „Zobacz”. The name is the
 * link; it covers the whole card, so the card is one tab stop with a short accessible name.
 */
export function BuildCardView({ card, eager = false }: { card: BuildCard; eager?: boolean }) {
  return (
    <article className="bl-card cut" style={{ ['--c' as string]: `var(--c-${card.slug})` }}>
      <span className="bl-card__art" aria-hidden="true">
        <Image
          className="bl-card__scene"
          src={`/scenes/${card.key}-card.webp`}
          alt=""
          width={580}
          height={331}
          loading={eager ? 'eager' : 'lazy'}
        />
        {card.photo && (
          <span className="bl-card__photo">
            <Image src={card.photo.src} alt="" width={160} height={182} />
          </span>
        )}
      </span>
      <div className="bl-card__tx">
        <p className="bl-card__m">
          <span className="bl-badge">Moc {card.tierRoman}</span>
          <i className="lore">{card.tierLabel}</i>
        </p>
        <h2 className="nm bl-card__name">
          <Link href={buildHref(card.slug)} className="bl-card__link">
            {card.name}
          </Link>
        </h2>
        <p className="lore bl-card__short">{card.short}</p>
        {card.specs.length > 0 && (
          <ul className="bl-card__specs" aria-label="W skrócie">
            {card.specs.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
        {card.fps && (
          <p className="bl-card__fps">
            {card.fpsLabel}: <b>{card.fps.fps} FPS</b> <SourceLabel kind={card.fps.kind} />
          </p>
        )}
        <p className="bl-card__p">
          {card.price !== null ? <b>{zl(card.price)}</b> : <span />}
          <span className="lnk bl-card__go" aria-hidden="true">
            Zobacz <IconArrow />
          </span>
        </p>
      </div>
    </article>
  )
}
