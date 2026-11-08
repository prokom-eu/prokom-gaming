import Image from 'next/image'
import Link from 'next/link'

import { CasePhoto } from '@/components/CasePhoto'
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
          // Drawn ~1.52× the card's width (pedestal in the middle, runda v3 §1.1): one column up to
          // 1000 px, three of ~420 px above. Without `sizes` a phone took far too big a file (G15).
          sizes="(max-width: 1000px) 152vw, 640px"
          loading={eager ? 'eager' : 'lazy'}
        />
        {card.photo && (
          <span className="bl-card__photo">
            {/* The case is at most 180 px tall (72% of the 250 px art); file width from its box. */}
            {/* Lazy, as before: the scene above is the LCP element, the photo must not compete. */}
            <CasePhoto photo={card.photo} caseHeight={180} />
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
        <p className="bl-card__hl">{card.highlight}</p>
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
