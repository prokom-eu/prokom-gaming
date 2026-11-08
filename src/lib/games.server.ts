import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import {
  gameFaq,
  hasRequirements,
  pickCards,
  picksTable,
  type GameInfo,
  type GameQuestion,
  type GameRequirements,
  type PickCard,
  type PickerGame,
  type PicksTable,
} from './games'
import { gamesPanel, type GamesPanelData, type HeroData } from './home'
import { loadOffer } from './offer.server'

type Payload = Awaited<ReturnType<typeof getPayload>>

/** A game in the picker: its scale for the numbers, plus requirements only when filled. */
export type PickerGameData = PickerGame & {
  seoPage: boolean
  requirements: GameRequirements | null
}

/** Everything the game pages hand to the browser: games, tier rows, picks and their cards. */
export type PickerData = {
  games: PickerGameData[]
  panel: GamesPanelData
  picks: PicksTable
  cards: Record<string, PickCard>
}

export type GamePageData = PickerData & {
  game: GameInfo
  faq: GameQuestion[]
  /** „Inne gry”: the most popular games with a page, without this one. */
  others: { slug: string; name: string }[]
}

/** Number of „Inne gry” chips (board KomputerDo). */
const OTHER_GAMES = 12

/** All 33 games with what the pages need, as the public visitor (no panel field is selected). */
async function loadGames(payload: Payload): Promise<GameWithPage[]> {
  const games = await payload.find({
    collection: 'games',
    select: {
      slug: true,
      name: true,
      kind: true,
      fpsCap: true,
      setting: true,
      settingNote: true,
      seoPage: true,
      intro: true,
      requirements: { min: true, recommended: true, max: true, source: true, checkedAt: true },
    },
    sort: 'popularRank',
    overrideAccess: false,
    depth: 0,
    pagination: false,
  })
  return games.docs.map((g) => ({
    slug: g.slug,
    name: g.name,
    kind: g.kind,
    fpsCap: g.fpsCap ?? null,
    setting: g.setting,
    settingNote: g.settingNote ?? null,
    intro: g.intro ?? null,
    seoPage: g.seoPage ?? true,
    requirements: {
      min: g.requirements?.min ?? null,
      recommended: g.requirements?.recommended ?? null,
      max: g.requirements?.max ?? null,
      source: g.requirements?.source ?? null,
      checkedAt: g.requirements?.checkedAt ?? null,
    },
  }))
}

type GameWithPage = GameInfo & { seoPage: boolean }

function pickerData(
  hero: HeroData,
  games: readonly GameWithPage[],
  table: Parameters<typeof gamesPanel>[2],
): PickerData {
  const list: PickerGameData[] = games.map((g) => ({
    slug: g.slug,
    name: g.name,
    kind: g.kind,
    fpsCap: g.fpsCap,
    settingNote: g.settingNote,
    seoPage: g.seoPage,
    requirements: hasRequirements(g.requirements) ? g.requirements : null,
  }))
  return {
    games: list,
    panel: gamesPanel(hero, list, table),
    picks: picksTable(hero, list, table),
    cards: pickCards(hero),
  }
}

/** `/dobor-pod-gre`: all 33 games; `null` without an offer (empty database). */
export async function loadPicker(): Promise<PickerData | null> {
  const payload = await getPayload({ config })
  const [{ hero, fps }, games] = await Promise.all([loadOffer(payload), loadGames(payload)])
  if (hero.tiers.length === 0 || games.length === 0) return null
  return pickerData(hero, games, fps.table)
}

/**
 * `/komputer-do/[gra]`: one game (`null` = unknown slug or a game without its page → 404). The
 * tier rows and picks travel for this game only.
 */
export async function loadGamePage(slug: string): Promise<GamePageData | null> {
  const payload = await getPayload({ config })
  const [{ hero, fps }, games] = await Promise.all([loadOffer(payload), loadGames(payload)])
  const all = games
  const game = all.find((g) => g.slug === slug && g.seoPage)
  if (!game || hero.tiers.length === 0) return null
  return {
    ...pickerData(hero, [game], fps.table),
    game,
    faq: gameFaq(game, hero),
    others: all
      .filter((g) => g.seoPage && g.slug !== slug)
      .slice(0, OTHER_GAMES)
      .map((g) => ({ slug: g.slug, name: g.name })),
  }
}

/** Slugs of games with a page (sitemap in G15, e2e). */
export async function loadGameSlugs(): Promise<string[]> {
  const payload = await getPayload({ config })
  const games = await loadGames(payload)
  return games.filter((g) => g.seoPage).map((g) => g.slug)
}
