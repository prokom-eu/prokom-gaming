/**
 * „Wszystkie zestawy” (spec. §5, board Zestawy). Browser-safe: cards carry public labels, sell
 * prices and stored FPS only (ADR-G002 §8.7). `lib/offer.server.ts` reads the database;
 * `buildCards()` shapes the cards, the rest are the filter rules and their URL form.
 */
import { RESOLUTION_LABELS, type FpsKind, type Resolution } from './fps'
import { bestiaryOrder, HERO_GAMES, TIER_HINTS, type HeroData } from './home'
import { plural } from './pl'

/** Filter values as they appear in the address (spec. §5). */
export const MONITOR_VALUES = ['fullhd', '2k', '4k'] as const
export const BUDGET_VALUES = ['do9', '9-15', 'od15'] as const
export const KIND_VALUES = ['amd', 'intel', 'biale'] as const

export type MonitorFilter = (typeof MONITOR_VALUES)[number]
export type BudgetFilter = (typeof BUDGET_VALUES)[number]
export type KindFilter = (typeof KIND_VALUES)[number]

/** `null` = „Wszystkie” / „Każdy”. */
export type BuildFilters = {
  monitor: MonitorFilter | null
  budget: BudgetFilter | null
  kind: KindFilter | null
}

export const NO_FILTERS: BuildFilters = { monitor: null, budget: null, kind: null }

/** Chip labels in board order; the first one clears the group. */
export const MONITOR_CHOICES: readonly { value: MonitorFilter | null; label: string }[] = [
  { value: null, label: 'Wszystkie' },
  { value: 'fullhd', label: 'FullHD' },
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
]
export const BUDGET_CHOICES: readonly { value: BudgetFilter | null; label: string }[] = [
  { value: null, label: 'Każdy' },
  { value: 'do9', label: 'do 9 tys.' },
  { value: '9-15', label: '9–15 tys.' },
  { value: 'od15', label: 'ponad 15 tys.' },
]
export const KIND_CHOICES: readonly { value: KindFilter | null; label: string }[] = [
  { value: null, label: 'Wszystkie' },
  { value: 'amd', label: 'AMD' },
  { value: 'intel', label: 'Intel' },
  { value: 'biale', label: 'Białe' },
]

const MONITOR_RESOLUTION: Record<MonitorFilter, Resolution> = {
  fullhd: 'fullhd',
  '2k': 'qhd',
  '4k': 'uhd',
}

/** What a filter looks at — kept apart from the card, so the client gets only these facts. */
export type BuildFacets = {
  /** `power-levels.monitorFilters`: FullHD = Moc I–IV, 2K = IV–VII, 4K = VII–IX. */
  monitors: Resolution[]
  price: number | null
  /** By the processor's platform (LGA… = Intel). */
  vendor: 'amd' | 'intel'
  white: boolean
}

export type BuildCard = {
  slug: string
  name: string
  /** File key of the scene and sigil (`baba` for Baba Jaga). */
  key: string
  short: string
  tierRoman: string
  tierLabel: string
  /** Chips: CPU, GPU (public labels) and the tier hint (board: „monitor 4K”). */
  specs: string[]
  /** „Cyberpunk 2077, 2K” — the level's own resolution. */
  fpsLabel: string
  fps: { fps: number; kind: FpsKind } | null
  price: number | null
  photo: { src: string; alt: string } | null
  facets: BuildFacets
}

/** Extra public fields per build slug (from `loadOffer()`). */
export type CardExtras = {
  short: string
  shell: 'dark' | 'white'
  monitorFilters: readonly Resolution[]
  platform: string
}

const CARD_GAME = 'cyberpunk-2077'

/** The 16 cards in price order (spec. §5); a build without its extras is skipped. */
export function buildCards(hero: HeroData, extras: ReadonlyMap<string, CardExtras>): BuildCard[] {
  const game = HERO_GAMES.findIndex((g) => g.slug === CARD_GAME)
  const cards: BuildCard[] = []
  for (const b of bestiaryOrder(hero.builds)) {
    const extra = extras.get(b.slug)
    if (!extra) continue
    const hint = TIER_HINTS[b.tier]
    cards.push({
      slug: b.slug,
      name: b.name,
      key: b.key,
      short: extra.short,
      tierRoman: b.tierRoman,
      tierLabel: b.tierLabel,
      specs: [b.cpu, b.gpu, hint].filter((s): s is string => Boolean(s)),
      fpsLabel: `Cyberpunk 2077, ${RESOLUTION_LABELS[b.resolution]}`,
      fps: b.fps[game] ?? null,
      price: b.price,
      photo: b.photo,
      facets: {
        monitors: [...extra.monitorFilters],
        price: b.price,
        vendor: extra.platform.startsWith('LGA') ? 'intel' : 'amd',
        white: extra.shell === 'white',
      },
    })
  }
  return cards
}

function budgetMatches(price: number | null, budget: BudgetFilter): boolean {
  if (price === null) return false
  switch (budget) {
    case 'do9':
      return price < 9000
    case '9-15':
      return price >= 9000 && price <= 15000
    case 'od15':
      return price > 15000
  }
}

function kindMatches(facets: BuildFacets, kind: KindFilter): boolean {
  switch (kind) {
    case 'amd':
      return facets.vendor === 'amd'
    case 'intel':
      return facets.vendor === 'intel'
    case 'biale':
      return facets.white
  }
}

/** Rules of spec. §5 (= board Zestawy JS); all three groups must match. */
export function matchesFilters(facets: BuildFacets, filters: BuildFilters): boolean {
  if (filters.monitor && !facets.monitors.includes(MONITOR_RESOLUTION[filters.monitor])) {
    return false
  }
  if (filters.budget && !budgetMatches(facets.price, filters.budget)) return false
  if (filters.kind && !kindMatches(facets, filters.kind)) return false
  return true
}

type Params = URLSearchParams | Record<string, string | string[] | undefined>

function first(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function oneOf<T extends string>(values: readonly T[], value: string | undefined): T | null {
  return values.find((v) => v === value) ?? null
}

/** Filters from the address; unknown values are ignored (a hand-edited link still works). */
export function parseFilters(params: Params): BuildFilters {
  return {
    monitor: oneOf(MONITOR_VALUES, first(params, 'monitor')),
    budget: oneOf(BUDGET_VALUES, first(params, 'budzet')),
    kind: oneOf(KIND_VALUES, first(params, 'rodzaj')),
  }
}

/** `?monitor=2k&budzet=9-15` in a fixed order, or `''` without filters. */
export function filtersQuery(filters: BuildFilters): string {
  const params = new URLSearchParams()
  if (filters.monitor) params.set('monitor', filters.monitor)
  if (filters.budget) params.set('budzet', filters.budget)
  if (filters.kind) params.set('rodzaj', filters.kind)
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** Badge on „Filtry” (phone): the groups inside the sheet that are set — budget and kind. */
export function sheetFilterCount(filters: BuildFilters): number {
  return (filters.budget ? 1 : 0) + (filters.kind ? 1 : 0)
}

/** „zestaw” / „zestawy” / „zestawów”. */
export function buildsWord(count: number): string {
  return plural(count, ['zestaw', 'zestawy', 'zestawów'])
}
