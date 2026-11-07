/**
 * Search of the Gaming site (NAWIGACJA §5.2) on the engine copied from prokom-web: no Polish
 * letters or case, word prefixes, one typo from 4 characters, game aliases and synonyms. Runs in
 * the browser over the index (`searchIndex.ts`).
 */
import {
  normalizeText,
  prepareItems,
  searchItems,
  tokenize,
  type PreparedItems,
  type SearchEntry,
} from './engine'
import type { SearchBuild, SearchGame, SearchIndex, SearchPage } from './searchIndex'

/** Short names players type (NAWIGACJA §5.1); keys are game slugs. */
export const GAME_ALIASES: Record<string, string[]> = {
  'counter-strike-2': ['cs2', 'cs', 'csgo', 'counter strike'],
  'gta-v': ['gta', 'gta5'],
  'league-of-legends': ['lol'],
  'call-of-duty-warzone': ['wz', 'warzone', 'cod'],
  'ea-sports-fc-27': ['fc', 'fifa'],
  'wiedzmin-3': ['witcher'],
  'red-dead-redemption-2': ['rdr2', 'rdr'],
  'baldurs-gate-3': ['bg3'],
  'dziedzictwo-hogwartu': ['hogwarts'],
  'black-myth-wukong': ['wukong'],
  'stalker-2': ['stalker'],
}

/** „Popularne” with an empty query: a fixed list (statistics are not read — NAWIGACJA §5.3). */
export const POPULAR_BUILDS = ['skrzat', 'bies', 'kikimora', 'wampir'] as const
export const POPULAR_GAMES = [
  'fortnite',
  'counter-strike-2',
  'minecraft',
  'cyberpunk-2077',
] as const

/** Words that ask for the cheapest builds: the results come by price (NAWIGACJA §5.2). */
const CHEAP = new Set(['tani', 'tania', 'tanie', 'tanio', 'najtanszy', 'najtansze', 'najtaniej'])

/** Filler words of a query („komputer do fortnite”, „dla syna”). */
const STOP_WORDS = ['dla', 'do', 'w', 'na', 'pod', 'i', 'z', 'komputer', 'komputera', 'pc']

/** At most this many results in a group (NAWIGACJA §5.3). */
export const GROUP_MAX = 5

type Hit =
  | { kind: 'build'; build: SearchBuild }
  | { kind: 'game'; game: SearchGame }
  | { kind: 'page'; page: SearchPage }

export type PreparedSearch = {
  index: SearchIndex
  items: PreparedItems<Hit>
  stopWords: Set<string>
}

/** Work done once per index. */
export function prepareSearch(index: SearchIndex): PreparedSearch {
  const entries: SearchEntry<Hit>[] = [
    ...index.builds.map((build) => ({
      item: { kind: 'build' as const, build },
      name: build.name,
      hay: normalizeText(`${build.name} ${build.tier} ${build.resolution}`),
    })),
    ...index.games.map((game) => ({
      item: { kind: 'game' as const, game },
      name: `${game.name} ${(GAME_ALIASES[game.slug] ?? []).join(' ')}`,
      hay: normalizeText(`${game.name} ${(GAME_ALIASES[game.slug] ?? []).join(' ')}`),
    })),
    ...index.pages.map((page) => ({
      item: { kind: 'page' as const, page },
      name: page.title,
      hay: normalizeText(`${page.title} ${page.text} ${page.words ?? ''}`),
    })),
  ]
  return {
    index,
    items: prepareItems(entries, { synonyms: {}, stopWords: STOP_WORDS }),
    stopWords: new Set(STOP_WORDS),
  }
}

export type SearchResult = {
  games: SearchGame[]
  builds: SearchBuild[]
  /** The game whose smooth builds fill „Zestawy pod {gra}” (when no build matched by name). */
  buildsFor: SearchGame | null
  pages: SearchPage[]
}

const EMPTY: SearchResult = { games: [], builds: [], buildsFor: null, pages: [] }

/** Results of a query in groups, at most 5 each; `null` for an empty query (show „Popularne”). */
export function searchSite(prepared: PreparedSearch, query: string): SearchResult | null {
  const tokens = tokenize(query, prepared.stopWords)
  if (tokens.length === 0) return null
  const { index } = prepared

  // „tani”, „najtańszy”: the cheapest builds (the index lists them by price).
  if (tokens.some((t) => CHEAP.has(t))) {
    const rest = tokens.filter((t) => !CHEAP.has(t)).join(' ')
    const narrowed = rest ? searchSite(prepared, rest) : null
    const builds = narrowed ? narrowed.builds : index.builds
    return { ...EMPTY, builds: [...builds].sort(byPrice).slice(0, GROUP_MAX) }
  }

  const hits = searchItems(prepared.items, tokens.join(' ')) ?? []
  const games = hits.flatMap((h) => (h.kind === 'game' ? [h.game] : []))
  let builds = hits.flatMap((h) => (h.kind === 'build' ? [h.build] : []))
  const pages = hits.flatMap((h) => (h.kind === 'page' ? [h.page] : []))
  let buildsFor: SearchGame | null = null
  if (builds.length === 0 && games[0]) {
    buildsFor = games[0]
    const bySlug = new Map(index.builds.map((b) => [b.slug, b]))
    builds = games[0].smooth.flatMap((slug) => bySlug.get(slug) ?? [])
  }
  return {
    games: games.slice(0, GROUP_MAX),
    builds: builds.slice(0, GROUP_MAX),
    buildsFor,
    pages: pages.slice(0, GROUP_MAX),
  }
}

const byPrice = (a: SearchBuild, b: SearchBuild) => (a.price ?? Infinity) - (b.price ?? Infinity)

/** „Popularne” from the index (slugs missing in the database are skipped). */
export function popular(index: SearchIndex): { builds: SearchBuild[]; games: SearchGame[] } {
  const build = new Map(index.builds.map((b) => [b.slug, b]))
  const game = new Map(index.games.map((g) => [g.slug, g]))
  return {
    builds: POPULAR_BUILDS.flatMap((s) => build.get(s) ?? []),
    games: POPULAR_GAMES.flatMap((s) => game.get(s) ?? []),
  }
}

/** True when the search found nothing at all (show „Zapytaj”). */
export function isEmpty(result: SearchResult): boolean {
  return !result.games.length && !result.builds.length && !result.pages.length
}
