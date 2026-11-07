/*
 * Copied from prokom-web `src/lib/shared/search/engine.ts` (and `normalize.ts`) on 06.11.2026,
 * as NAWIGACJA §5.2 asks: the same algorithm as the Biznes search, no shared package. Changes:
 * one typo allowed for every word of ≥ 4 characters (Gaming spec §5.2: Levenshtein ≤ 1), and
 * `normalizeText` inlined below.
 */

/**
 * Search form of a text: lower case, `ł → l` (NFD does not split it), no diacritics, single
 * spaces.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The search engine of every line (ADR-014 rozstrz. SW0 10, spec WSPOLNE-ELEMENTY §5.1): on the
 * client over the line's index — Biznes products, Software solutions, the shared search dialog.
 * A port of `__pk17` from `docs/design/prokombiznes/boards/Main.dc.html`: every token must match,
 * a hit in the name weighs 3, elsewhere 1, through a synonym 1, a typo 0.6, plus
 * `popularity / 200`. A hit only in the group name weighs 0.05 (B4c): „kasa” must not lift every
 * scanner of „Kasy i sprzedaż” to the level of a cash register. Moved from `lib/search.ts` (D2-2),
 * which keeps the Biznes catalog part and re-exports this, so Biznes behaves as before.
 */

const NAME_HIT = 3
const HAY_HIT = 1
const SYNONYM_HIT = 1
const TYPO_HIT = 0.6
/**
 * Below any hit in the product itself, popularity included: popularity is 0–100, so it adds
 * at most 0.5, and 0.05 + 0.5 stays under a typo (0.6).
 */
const GROUP_HIT = 0.05
/**
 * A token in the name of the product's main category (audit 01.11): „kasa” lifts the fiscal
 * registers above a UPS whose name says „kasa i komputer”, „laptop” the laptops. Any kind of hit
 * there (as is, synonym, typo) counts, just above a hit in the name of a product elsewhere; inside
 * the category a name hit still comes first (`CATEGORY_HIT + NAME_IN_CATEGORY`). A typo counts in
 * full on purpose: Polish inflection („kasa” → „Kasy fiskalne”, „laptop” → „Laptopy”) reaches the
 * category name only as a typo of one letter.
 */
const CATEGORY_HIT = 3.2
const NAME_IN_CATEGORY = 0.5

/** Words shorter than this are not compared for typos (spec. §8.2: from 4 characters). */
const TYPO_MIN_TOKEN = 4

/** Normalized text with its words, compared for typos. */
export type SearchText = { text: string; words: string[] }

/** What the engine needs of one searchable element (a product, a solution…). */
export type SearchEntry<T> = {
  item: T
  /** Name (with the brand for a product): a hit there weighs the most. */
  name: string
  /** Normalized text of the element (`normalizeText`), the name included. */
  hay: string
  /** 0–100; adds at most 0.5, so it only orders equal hits. */
  popularity?: number
  /** Name of the element's group: a hit only there weighs `GROUP_HIT`. */
  group?: string | null
  /** Name of the element's main category: a hit there weighs `CATEGORY_HIT`. */
  category?: string | null
}

/** Search settings of a line, as its index carries them. */
export type SearchSettings = { synonyms: Record<string, string[]>; stopWords: string[] }

type PreparedEntry<T> = {
  item: T
  name: string
  own: SearchText
  group: SearchText | null
  category: SearchText | null
  popularity: number
}

type TextHit = 'exact' | 'synonym' | 'typo'

export type PreparedItems<T> = {
  entries: PreparedEntry<T>[]
  synonyms: Map<string, string[]>
  stopWords: Set<string>
}

/** Optimal string alignment distance: insertions, deletions, substitutions, adjacent swaps. */
export function damerauLevenshtein(a: string, b: string): number {
  // Typos are allowed up to 2 edits: past that the exact count does not matter.
  if (Math.abs(a.length - b.length) > 2) return Math.max(a.length, b.length)
  const rows: number[][] = []
  for (let i = 0; i <= a.length; i++) rows.push([i])
  for (let j = 1; j <= b.length; j++) rows[0]![j] = j
  for (let i = 1; i <= a.length; i++) {
    const row = rows[i]!
    const prev = rows[i - 1]!
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, rows[i - 2]![j - 2]! + 1)
      }
      row[j] = value
    }
  }
  return rows[a.length]![b.length]!
}

/** Tokens of a query: normalized, split on non-alphanumerics, without stop words. */
export function tokenize(query: string, stopWords: Set<string>): string[] {
  return normalizeText(query)
    .split(/[^a-z0-9]+/)
    .filter((token) => token && !stopWords.has(token))
}

/** Work done once per index: normalized names, words for typos, normalized settings. */
export function prepareItems<T>(
  entries: readonly SearchEntry<T>[],
  settings: SearchSettings,
): PreparedItems<T> {
  return {
    entries: entries.map((entry) => ({
      item: entry.item,
      name: normalizeText(entry.name),
      own: searchText(entry.hay),
      group: entry.group ? searchText(normalizeText(entry.group)) : null,
      category: entry.category ? searchText(normalizeText(entry.category)) : null,
      popularity: entry.popularity ?? 0,
    })),
    synonyms: new Map(
      Object.entries(settings.synonyms).map(([phrase, expansions]) => [
        normalizeText(phrase),
        expansions.map(normalizeText).filter(Boolean),
      ]),
    ),
    stopWords: new Set(settings.stopWords.map(normalizeText)),
  }
}

// Gaming: one typo for every word of ≥ 4 characters (NAWIGACJA §5.2), not two from 7 as Biznes.
function typoLimit(): number {
  return 1
}

export function searchText(text: string): SearchText {
  return { text, words: text.split(/[^a-z0-9]+/).filter((word) => word.length > 2) }
}

/** How a token hits a text: as is, through a synonym, with a typo — or not at all. */
export function textHit(
  { text, words }: SearchText,
  token: string,
  synonyms: Map<string, string[]>,
): TextHit | null {
  if (text.includes(token)) return 'exact'
  if (synonyms.get(token)?.some((expansion) => text.includes(expansion))) return 'synonym'
  if (token.length >= TYPO_MIN_TOKEN) {
    const limit = typoLimit()
    for (const word of words) {
      if (
        damerauLevenshtein(token, word.slice(0, token.length)) <= limit ||
        damerauLevenshtein(token, word) <= limit
      ) {
        return 'typo'
      }
    }
  }
  return null
}

function tokenScore<T>(
  entry: PreparedEntry<T>,
  token: string,
  synonyms: Map<string, string[]>,
): number {
  if (entry.category && textHit(entry.category, token, synonyms)) {
    return CATEGORY_HIT + (entry.name.includes(token) ? NAME_IN_CATEGORY : 0)
  }
  switch (textHit(entry.own, token, synonyms)) {
    case 'exact':
      return entry.name.includes(token) ? NAME_HIT : HAY_HIT
    case 'synonym':
      return SYNONYM_HIT
    case 'typo':
      return TYPO_HIT
    case null:
      return entry.group && textHit(entry.group, token, synonyms) ? GROUP_HIT : 0
  }
}

/** Elements matching every token, best first; `null` when the query has no tokens. */
export function searchItems<T>(prepared: PreparedItems<T>, query: string): T[] | null {
  const tokens = tokenize(query, prepared.stopWords)
  if (tokens.length === 0) return null
  const scored: { item: T; score: number }[] = []
  for (const entry of prepared.entries) {
    let score = 0
    for (const token of tokens) {
      const hit = tokenScore(entry, token, prepared.synonyms)
      if (hit === 0) {
        score = 0
        break
      }
      score += hit
    }
    if (score > 0) scored.push({ item: entry.item, score: score + entry.popularity / 200 })
  }
  // Stable sort: equal scores keep the index order.
  return scored.sort((a, b) => b.score - a.score).map(({ item }) => item)
}
