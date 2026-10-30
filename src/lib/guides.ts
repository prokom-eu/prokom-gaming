import { plural } from './pl'

/** Topics of the guides (board Poradniki: filters), with their value in the address (`?temat=`). */
export const GUIDE_CATEGORIES = [
  { value: 'parents', label: 'Dla rodziców', param: 'dla-rodzicow' },
  { value: 'hardware', label: 'Wybór sprzętu', param: 'wybor-sprzetu' },
  { value: 'games', label: 'Gry', param: 'gry' },
  { value: 'after', label: 'Po zakupie', param: 'po-zakupie' },
] as const

export type GuideCategory = (typeof GUIDE_CATEGORIES)[number]['value']

export const GUIDES_PATH = '/poradniki'
export const guidePath = (slug: string) => `${GUIDES_PATH}/${slug}`

export const categoryLabel = (value: string): string =>
  GUIDE_CATEGORIES.find((c) => c.value === value)?.label ?? value

/** Topic from the address; unknown or missing = all guides. */
export function topicFromParam(param: string | string[] | undefined): GuideCategory | null {
  const value = Array.isArray(param) ? param[0] : param
  return GUIDE_CATEGORIES.find((c) => c.param === value)?.value ?? null
}

/** „Dla rodziców, 8 min czytania” (board: line above the card title). */
export const guideKicker = (category: string, minutes: number): string =>
  `${categoryLabel(category)}, ${readingTime(minutes)}`

export const readingTime = (minutes: number): string => `${minutes} min czytania`

/** „1 poradnik”, „3 poradniki”, „5 poradników”. */
export const guidesCount = (n: number): string =>
  `${n} ${plural(n, ['poradnik', 'poradniki', 'poradników'])}`

export type GuideCard = {
  slug: string
  title: string
  lead: string
  category: string
  readingTime: number
  creature: string
}

/**
 * List of `/poradniki`: the newest guide of the topic is featured, the rest form the grid
 * (input sorted newest first). The topic chips show only topics that have a guide.
 */
export function guideList(guides: readonly GuideCard[], topic: GuideCategory | null) {
  const shown = topic ? guides.filter((g) => g.category === topic) : guides
  const [featured, ...rest] = shown
  const topics = GUIDE_CATEGORIES.filter((c) => guides.some((g) => g.category === c.value))
  return { featured: featured ?? null, rest, topics }
}

/** „Czytaj dalej”: other guides, the same topic first, at most `limit`. */
export function relatedGuides(
  guides: readonly GuideCard[],
  current: Pick<GuideCard, 'slug' | 'category'>,
  limit = 3,
): GuideCard[] {
  const others = guides.filter((g) => g.slug !== current.slug)
  return [
    ...others.filter((g) => g.category === current.category),
    ...others.filter((g) => g.category !== current.category),
  ].slice(0, limit)
}

/** JSON-LD of a guide: `Article` and `BreadcrumbList` (spec. §23). */
export function guideJsonLd(input: {
  siteUrl: string
  slug: string
  title: string
  lead: string
  author: string
  publishedAt: string | null
  updatedAt: string | null
}): object[] {
  const url = (path: string) => new URL(path, input.siteUrl).toString()
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: input.title,
      description: input.lead,
      author: { '@type': 'Organization', name: input.author },
      publisher: { '@type': 'Organization', name: 'PRO-KOM Gaming' },
      ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
      ...(input.updatedAt ? { dateModified: input.updatedAt } : {}),
      mainEntityOfPage: url(guidePath(input.slug)),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Poradniki', item: url(GUIDES_PATH) },
        {
          '@type': 'ListItem',
          position: 2,
          name: input.title,
          item: url(guidePath(input.slug)),
        },
      ],
    },
  ]
}
