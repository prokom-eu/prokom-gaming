import Image from 'next/image'
import Link from 'next/link'

import { Sigil } from '@/components/Sigil'
import { guideKicker, guidePath, type GuideCard } from '@/lib/guides'
import { menuCreatures } from '@/lib/site'

/** Scene and sigil key of a creature (`baba-jaga` → `baba`). */
export const creatureKey = (slug: string): string =>
  menuCreatures.find((c) => c.slug === slug)?.id ?? slug

/** Colour token of a creature (`--c-baba-jaga`). */
export const creatureColor = (slug: string): string => `var(--c-${slug})`

/**
 * Card of a guide (boards Poradniki / Poradnik: `.gd7`): the creature's scene with its sigil,
 * topic and reading time, title, lead. `featured`: the big card at the top of the list.
 */
export function GuideCardView({
  guide,
  featured = false,
  eager = false,
}: {
  guide: GuideCard
  featured?: boolean
  eager?: boolean
}) {
  const key = creatureKey(guide.creature)
  return (
    <Link
      className={featured ? 'ct-guide ct-guide--big' : 'ct-guide'}
      href={guidePath(guide.slug)}
      style={{ '--c': creatureColor(guide.creature) } as React.CSSProperties}
    >
      <span className="ct-guide__visual">
        <Image
          src={`/scenes/${key}-card.webp`}
          alt=""
          width={1680}
          height={960}
          sizes={featured ? '(max-width: 1000px) 100vw, 700px' : '(max-width: 640px) 100vw, 420px'}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
        />
        <span className="ct-guide__fade" aria-hidden="true" />
        <span className="ct-guide__sigil">
          <Sigil id={key} size={46} />
        </span>
      </span>
      <span className="ct-guide__body">
        <small>{guideKicker(guide.category, guide.readingTime)}</small>
        <b className="h">{guide.title}</b>
        <span>{guide.lead}</span>
      </span>
    </Link>
  )
}
