import Image from 'next/image'
import Link from 'next/link'

import { SourceLabel } from '@/components/SourceLabel'
import type { FpsKind } from '@/lib/fps'
import type { PickCard as PickCardData, PickTag } from '@/lib/games'
import { zl } from '@/lib/pricing/format'

/**
 * Recommendation card of „Dobór pod grę” (board Gra `.gpk`): the tag, the creature's scene with
 * its case, the name, tier and realm, the number with its source and the price.
 */
export function PickCard({
  tag,
  card,
  fpsText,
  kind,
}: {
  tag: PickTag
  card: PickCardData
  fpsText: string
  kind: FpsKind
}) {
  return (
    <Link
      href={`/zestawy/${card.slug}`}
      className="gm-pick cut"
      style={{ ['--c' as string]: `var(--c-${card.slug})` }}
    >
      <span className="gm-pick__tag">{tag}</span>
      <span className="gm-pick__view" aria-hidden="true">
        <Image
          className="gm-pick__scene"
          src={`/scenes/${card.key}-card.webp`}
          alt=""
          width={560}
          height={320}
        />
        <span className="gm-pick__fade" />
        {card.photo && (
          <span className="gm-pick__photo">
            <Image src={card.photo.src} alt="" width={300} height={341} />
          </span>
        )}
      </span>
      <strong className="nm">{card.name}</strong>
      <em className="lore">
        Moc {card.tierRoman}, {card.tierLabel}
      </em>
      <b className="gm-pick__fps">{fpsText}</b>
      <SourceLabel kind={kind} />
      {card.price !== null && <span className="gm-pick__price">{zl(card.price)}</span>}
    </Link>
  )
}
