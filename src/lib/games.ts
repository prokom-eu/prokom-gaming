/**
 * „Dobór pod grę” and „Komputer do {gry}” (spec. §8, boards Gra and KomputerDo). Browser-safe:
 * public labels, sell prices and stored FPS only (ADR-G002 §8.7). The site never computes frame
 * rates (ADR-G004) — it only picks which builds to recommend from the stored numbers.
 * `lib/games.server.ts` reads the database.
 */
import {
  fpsFor,
  RESOLUTION_LABELS,
  RESOLUTIONS,
  type FpsKind,
  type FpsTable,
  type GameScale,
  type Resolution,
} from './fps'
import type { HeroBuild, HeroData } from './home'

/** Frames per second from which a game counts as smooth (spec. §8: „płynnie” ≥ 60). */
export const SMOOTH_FPS = 60

/** Each next recommendation needs at least this many times the previous one's frames (spec. §8). */
export const STEP_UP = 1.25

export const PICK_TAGS = ['Najtaniej płynnie', 'Złoty środek', 'Z zapasem'] as const
export type PickTag = (typeof PICK_TAGS)[number]

/** Game and resolution picked first on `/dobor-pod-gre` (board Gra). */
export const PICKER_DEFAULT_GAME = 'cyberpunk-2077'
export const PICKER_DEFAULT_RESOLUTION: Resolution = 'qhd'

export type PickerGame = GameScale & { slug: string; name: string; settingNote: string | null }

/** A recommended build for one game and resolution, with the number it is recommended for. */
export type GamePick = { tag: PickTag; slug: string; fps: number; kind: FpsKind }

type Priced = { slug: string; tier: number; price: number | null }

/**
 * The three recommendations of spec. §8 for one game and resolution, builds in price order:
 * - „Najtaniej płynnie” — the cheapest with ≥ 60 FPS;
 * - „Złoty środek” — the cheapest dearer one with ≥ 1.25 × the first one's FPS;
 * - „Z zapasem” — the cheapest dearer one with ≥ 1.25 × the middle one's FPS.
 * Without such a build the dearest smooth one takes the place; when nobody reaches 60 the only
 * card is „Z zapasem” with the most frames (Perun). A build is never shown twice, so there can be
 * fewer than three cards. A capped game (Elden Ring: 60) gets only the first — paying more gives
 * no extra frames. Builds without a price or without a number are left out.
 */
export function pickThree(
  builds: readonly Priced[],
  table: FpsTable,
  game: PickerGame,
  resolution: Resolution,
): GamePick[] {
  const rows = builds
    .flatMap((b) => {
      const r = b.price === null ? null : fpsFor(table, b.slug, game.slug, resolution)
      return r
        ? [{ slug: b.slug, tier: b.tier, price: b.price as number, fps: r.fps, kind: r.kind }]
        : []
    })
    .sort((a, b) => a.price - b.price || a.tier - b.tier)
  if (rows.length === 0) return []

  const pick = (tag: PickTag, row: (typeof rows)[number]): GamePick => ({
    tag,
    slug: row.slug,
    fps: row.fps,
    kind: row.kind,
  })
  const smooth = rows.filter((r) => r.fps >= SMOOTH_FPS)
  if (smooth.length === 0) {
    const best = rows.reduce((top, r) => (r.fps > top.fps ? r : top))
    return [pick('Z zapasem', best)]
  }

  const first = smooth[0]!
  if (game.kind === 'capped') return [pick('Najtaniej płynnie', first)]

  const next = (from: (typeof rows)[number]) =>
    rows.find((r) => r.price > from.price && r.fps >= STEP_UP * from.fps) ??
    smooth.filter((r) => r.price > from.price).at(-1)

  const picks = [pick('Najtaniej płynnie', first)]
  const middle = next(first)
  if (middle) {
    picks.push(pick('Złoty środek', middle))
    const top = next(middle)
    if (top) picks.push(pick('Z zapasem', top))
  }
  return picks
}

/** „płynnie” from 60 FPS, otherwise „poniżej 60” (spec. §8, board KomputerDo). */
export function smoothText(fps: number): 'płynnie' | 'poniżej 60' {
  return fps >= SMOOTH_FPS ? 'płynnie' : 'poniżej 60'
}

/**
 * Recommendations of every game at every resolution — compact, it travels to the browser:
 * `picks[resolution][game index]`.
 */
export type PicksTable = Record<Resolution, GamePick[][]>

export function picksTable(
  hero: HeroData,
  games: readonly PickerGame[],
  table: FpsTable,
): PicksTable {
  const out = { fullhd: [], qhd: [], uhd: [] } as PicksTable
  for (const resolution of RESOLUTIONS) {
    out[resolution] = games.map((g) => pickThree(hero.builds, table, g, resolution))
  }
  return out
}

/** What a recommendation card shows about a build (board Gra / KomputerDo). */
export type PickCard = {
  slug: string
  name: string
  key: string
  epithet: string
  heroTitle: string
  heroText: string
  tierRoman: string
  tierLabel: string
  price: number | null
  photo: { src: string; alt: string } | null
}

export function pickCards(hero: HeroData): Record<string, PickCard> {
  return Object.fromEntries(
    hero.builds.map((b) => [
      b.slug,
      {
        slug: b.slug,
        name: b.name,
        key: b.key,
        epithet: b.epithet,
        heroTitle: b.heroTitle,
        heroText: b.heroText,
        tierRoman: b.tierRoman,
        tierLabel: b.tierLabel,
        price: b.price,
        photo: b.photo,
      },
    ]),
  )
}

// ---------------------------------------------------------------------------------------------
// Address `?gra=<slug>&rozdz=fullhd|2k|4k` (spec. §2 dictionary).
// ---------------------------------------------------------------------------------------------

export const RESOLUTION_PARAMS: Record<Resolution, string> = {
  fullhd: 'fullhd',
  qhd: '2k',
  uhd: '4k',
}

export function resolutionFromParam(value: string | undefined | null): Resolution | null {
  return RESOLUTIONS.find((r) => RESOLUTION_PARAMS[r] === value) ?? null
}

type Params = URLSearchParams | Record<string, string | string[] | undefined>

export function firstParam(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export type PickerState = { game: string; resolution: Resolution }

/** State from the address; an unknown game or resolution falls back to the default. */
export function parsePicker(params: Params, games: readonly { slug: string }[]): PickerState {
  const game = firstParam(params, 'gra')
  const known = games.find((g) => g.slug === game)?.slug
  return {
    game: known ?? games.find((g) => g.slug === PICKER_DEFAULT_GAME)?.slug ?? games[0]?.slug ?? '',
    resolution: resolutionFromParam(firstParam(params, 'rozdz')) ?? PICKER_DEFAULT_RESOLUTION,
  }
}

export function pickerQuery(state: PickerState): string {
  return `?gra=${encodeURIComponent(state.game)}&rozdz=${RESOLUTION_PARAMS[state.resolution]}`
}

// ---------------------------------------------------------------------------------------------
// Page of one game (`/komputer-do/[gra]`): texts from templates and data.
// ---------------------------------------------------------------------------------------------

export type GameRequirements = {
  min: string | null
  recommended: string | null
  max: string | null
  source: string | null
  checkedAt: string | null
}

export type GameInfo = PickerGame & {
  intro: string | null
  setting: string
  requirements: GameRequirements
}

/**
 * The manufacturer's requirements are shown only when filled (spec. §8): at least one level and
 * the source with its date — without a source a number would not be checkable.
 */
export function hasRequirements(r: GameRequirements): boolean {
  return Boolean((r.min || r.recommended || r.max) && r.source && r.checkedAt)
}

/** Lead of the game page (board KomputerDo): the game's own sentence, then the fixed template. */
export function gameLead(game: { intro: string | null }): string {
  const template =
    'Sprawdź, ile klatek da każdy nasz poziom mocy w FullHD, 2K i 4K, i który komputer wystarczy na Twój monitor.'
  const intro = game.intro?.trim()
  return intro ? `${intro} ${template}` : template
}

/**
 * Meta description of a game page: unique per game, so 33 pages never share one (spec. §23). The
 * game's own intro when written in the panel, else a sentence with the game's name.
 * TODO(krystian): the sentence is a draft (no copy in the boards) — to accept before G16.
 */
export function gameDescription(game: { name: string; intro: string | null }): string {
  const intro = game.intro?.trim()
  if (intro) return gameLead(game)
  return `Ile klatek w ${game.name} da każdy nasz komputer w FullHD, 2K i 4K — liczby z niezależnych testów, z etykietą źródła. Sprawdź, który poziom mocy wystarczy na Twój monitor.`
}

export type GameQuestion = { question: string; answer: string }

/** Capacity of a RAM label, e.g. "32 GB DDR5 6000 CL30" → 32; `null` when it has none. */
export function ramGb(label: string | null): number | null {
  const match = label?.match(/(\d+)\s*GB/)
  return match ? Number(match[1]) : null
}

/** Lowest tier whose lead build has at least `gb` of RAM, e.g. "II"; `null` when none has. */
export function firstTierWithRam(hero: HeroData, gb: number): string | null {
  const bySlug = new Map<string, HeroBuild>(hero.builds.map((b) => [b.slug, b]))
  const tier = hero.tiers.find((t) => (ramGb(bySlug.get(t.lead)?.ram ?? null) ?? 0) >= gb)
  return tier?.roman ?? null
}

/**
 * „O co pytają gracze” (spec. §8: a template from data — scaling, RAM, RT). The questions and the
 * Cyberpunk wording are from board KomputerDo; the RAM tier comes from the offer, not the board.
 * TODO(krystian): confirm the template answers for e-sport and capped games (not on the board).
 */
export function gameFaq(game: GameInfo, hero: HeroData): GameQuestion[] {
  const questions: GameQuestion[] = []
  if (game.kind === 'esport') {
    questions.push({
      question: 'Czy włączyć skalowanie DLSS albo FSR?',
      answer: `W ${game.name} zwykle nie trzeba: to gra e-sportowa i klatek jest dużo bez skalowania. Nasze wyniki podajemy bez skalowania.`,
    })
  } else if (game.kind === 'capped') {
    questions.push({
      question: 'Czy włączyć skalowanie DLSS albo FSR?',
      answer: `${game.name} ma blokadę ${game.fpsCap ?? SMOOTH_FPS} klatek, więc skalowanie nie da ich więcej. Może za to odciążyć kartę i obniżyć temperatury.`,
    })
  } else {
    questions.push({
      question: 'Czy włączyć skalowanie DLSS albo FSR?',
      answer: `W ${game.name} tak, zwłaszcza w 2K i 4K. Skalowanie daje wyraźnie więcej klatek przy niewielkiej różnicy w obrazie. Nasze wyniki podajemy bez skalowania, więc z DLSS albo FSR klatek będzie więcej.`,
    })
  }
  const ramTier = firstTierWithRam(hero, 32)
  questions.push({
    question: 'Ile pamięci RAM potrzeba?',
    answer: ramTier
      ? `32 GB to dziś rozsądne minimum do nowych gier, zwłaszcza gdy obok działa Discord i przeglądarka. Taką pamięć mają nasze zestawy od Mocy ${ramTier}.`
      : '32 GB to dziś rozsądne minimum do nowych gier, zwłaszcza gdy obok działa Discord i przeglądarka.',
  })
  if (game.kind === 'aaa') {
    questions.push({
      question: 'Czy da się grać z ray tracingiem?',
      answer:
        'Tak, od wyższych poziomów mocy i najlepiej ze skalowaniem. Napisz, na czym Ci zależy, a dobierzemy komputer pod te ustawienia.',
    })
  }
  return questions
}

/** Page title (spec. §23). */
export function gameTitle(name: string): string {
  return `Komputer do ${name}: ile klatek w FullHD, 2K i 4K | PRO-KOM Gaming`
}

export const gamePath = (slug: string) => `/komputer-do/${slug}`

/** JSON-LD of a game page: `FAQPage` and `BreadcrumbList` (spec. §8). */
export function gameJsonLd(input: {
  siteUrl: string
  slug: string
  name: string
  faq: readonly GameQuestion[]
}): object[] {
  const url = (path: string) => new URL(path, input.siteUrl).toString()
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Strona główna', item: url('/') },
        { '@type': 'ListItem', position: 2, name: 'Dobór pod grę', item: url('/dobor-pod-gre') },
        {
          '@type': 'ListItem',
          position: 3,
          name: `Komputer do ${input.name}`,
          item: url(gamePath(input.slug)),
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: input.faq.map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: { '@type': 'Answer', text: q.answer },
      })),
    },
  ]
}

/** „FullHD / 2K / 4K” for headings („Polecamy na monitor 2K”). */
export const resolutionLabel = (r: Resolution) => RESOLUTION_LABELS[r]
