/**
 * Home hero data (spec. §4 pt 1, ADR-G003 §5). Browser-safe: the shapes below are everything the
 * hero's client component gets — public labels, sell prices and FPS numbers, never a cost or an
 * internal model (ADR-G002 §8.7). `lib/home.server.ts` reads the database and calls `buildHero()`.
 */
import {
  barPercent,
  fpsFor,
  fpsText,
  RESOLUTION_LABELS,
  RESOLUTIONS,
  type FpsKind,
  type FpsTable,
  type GameScale,
  type Resolution,
} from './fps'
import { priceFromSnapshot, type PriceSnapshot } from './pricing/snapshot'
import type { Config } from './pricing/types'

/** The two games on the creature card (board Main): an e-sport title and a heavy one. */
export const HERO_GAMES = [
  { slug: 'counter-strike-2', name: 'Counter-Strike 2' },
  { slug: 'cyberpunk-2077', name: 'Cyberpunk 2077' },
] as const

/** The creature shown first (spec. §4 pt 1: "domyślnie Wampir"). */
export const HERO_DEFAULT = 'wampir'

/** Interval of the automatic switch on desktop (ADR-G003 §5). */
export const HERO_INTERVAL_MS = 7000

/**
 * Material of the giant Cinzel name (board Main, `.hero6[data-b] .ttl-n`): four gradient stops in
 * `tokens.css` (`--mat-<name>-1…4`). "kosc" is the board's default preset, built from the
 * creature's own colour.
 */
export type Material = 'kosc' | 'krew' | 'lod' | 'ogien' | 'zloto'

const MATERIALS: Record<string, Material> = {
  strzyga: 'krew',
  zmora: 'krew',
  wampir: 'krew',
  rusalka: 'lod',
  'pani-zimy': 'lod',
  weles: 'ogien',
  zmij: 'ogien',
  perun: 'zloto',
}

export function materialOf(slug: string): Material {
  return MATERIALS[slug] ?? 'kosc'
}

/**
 * Size of the name in units of the 1440×1000 frame (board `fs`): long names are set smaller so
 * every name fills about the same width. Unknown names get the default.
 */
const NAME_SIZE: Record<string, number> = {
  strzyga: 188,
  rusalka: 188,
  kikimora: 165,
  'pani-zimy': 168,
  wilkolak: 159,
  'baba-jaga': 158,
  bazyliszek: 139,
}

export function nameSizeOf(slug: string): number {
  return NAME_SIZE[slug] ?? 205
}

export type HeroFps = { fps: number; kind: FpsKind }

export type HeroBuild = {
  slug: string
  name: string
  /** File key of the scene and sigil in /public (`baba` for Baba Jaga). */
  key: string
  accusative: string
  epithet: string
  /** "czarna, czerwone światło" — the card writes "Obudowa …". */
  look: string
  heroTitle: string
  heroText: string
  tier: number
  tierRoman: string
  /** Realm of the level, e.g. "4K", "FullHD start". */
  tierLabel: string
  resolution: Resolution
  cpu: string | null
  gpu: string | null
  ram: string | null
  disk: string | null
  /** Sell price from the newest published batch; `null` when it has none. */
  price: number | null
  photo: { src: string; alt: string } | null
  /** FPS on the card, in the order of `HERO_GAMES`, at the level's resolution. */
  fps: (HeroFps | null)[]
  material: Material
  nameSize: number
}

export type HeroTier = {
  tier: number
  roman: string
  /** FullHD / 2K / 4K under the medallion. */
  resolutionLabel: string
  /** Builds of the tier in card order; the first is not necessarily the lead. */
  builds: string[]
  /** Build the medallion and the automatic switch pick (`power-levels.leadBuild` of the lead). */
  lead: string
}

export type HeroData = {
  builds: HeroBuild[]
  tiers: HeroTier[]
  /** ISO date of the price batch ("Cena z …"); `null` without published prices. */
  pricedAt: string | null
}

/** No offer (empty database, no build with a level) or the database failed: text and buttons only. */
export const EMPTY_HERO: HeroData = { builds: [], tiers: [], pricedAt: null }

/** A build as the server reads it (public fields only). */
export type HeroBuildInput = {
  slug: string
  name: string
  config: Config
  creature: {
    key: string
    accusative: string
    epithet: string
    look: string
    heroTitle: string
    heroText: string
  }
}

/** A power level as the server reads it; `cpu`/`gpu` are the parts' public labels. */
export type HeroLevelInput = {
  code: string
  tier: number
  tierRoman: string
  tierLabel: string
  tierLead: boolean
  targetResolution: Resolution
  leadBuild: string | null
  cpu: string | null
  gpu: string | null
}

export type HeroOptionInput = {
  code: string
  publicLabel: string
  photo: { src: string; alt: string } | null
}

export function buildHero(input: {
  builds: readonly HeroBuildInput[]
  levels: readonly HeroLevelInput[]
  options: readonly HeroOptionInput[]
  snapshot: PriceSnapshot | null
  fps: FpsTable
}): HeroData {
  const levels = new Map(input.levels.map((l) => [l.code, l]))
  const options = new Map(input.options.map((o) => [o.code, o]))

  const builds: HeroBuild[] = []
  for (const b of input.builds) {
    const level = levels.get(b.config.level)
    if (!level) continue
    builds.push({
      slug: b.slug,
      name: b.name,
      key: b.creature.key,
      accusative: b.creature.accusative,
      epithet: b.creature.epithet,
      look: b.creature.look,
      heroTitle: b.creature.heroTitle,
      heroText: b.creature.heroText,
      tier: level.tier,
      tierRoman: level.tierRoman,
      tierLabel: level.tierLabel,
      resolution: level.targetResolution,
      cpu: level.cpu,
      gpu: level.gpu,
      ram: options.get(b.config.ram)?.publicLabel ?? null,
      disk: options.get(b.config.ssd)?.publicLabel ?? null,
      price: input.snapshot ? priceFromSnapshot(b.config, input.snapshot) : null,
      photo: options.get(b.config.case)?.photo ?? null,
      fps: HERO_GAMES.map((game) => {
        const row = fpsFor(input.fps, b.slug, game.slug, level.targetResolution)
        return row ? { fps: row.fps, kind: row.kind } : null
      }),
      material: materialOf(b.slug),
      nameSize: nameSizeOf(b.slug),
    })
  }
  // Card order inside a tier and medallion order overall: by level code (P01…P16 follow price).
  const levelCode = new Map(input.builds.map((b) => [b.slug, b.config.level]))
  builds.sort((a, b) => (levelCode.get(a.slug) ?? '').localeCompare(levelCode.get(b.slug) ?? ''))

  const tiers = new Map<number, HeroTier>()
  for (const build of builds) {
    const tier = tiers.get(build.tier) ?? {
      tier: build.tier,
      roman: build.tierRoman,
      resolutionLabel: RESOLUTION_LABELS[build.resolution],
      builds: [],
      lead: build.slug,
    }
    tier.builds.push(build.slug)
    tiers.set(build.tier, tier)
  }
  for (const level of input.levels) {
    const tier = tiers.get(level.tier)
    if (!level.tierLead || !tier || !level.leadBuild) continue
    if (tier.builds.includes(level.leadBuild)) {
      tier.lead = level.leadBuild
      // The lead level's resolution names the medallion (tier IV mixes FullHD-ultra and 2K).
      tier.resolutionLabel = RESOLUTION_LABELS[level.targetResolution]
    }
  }

  return {
    builds,
    tiers: [...tiers.values()].sort((a, b) => a.tier - b.tier),
    pricedAt: input.snapshot?.publishedAt ?? null,
  }
}

/** Order of the automatic switch: the lead creature of each tier, from Skrzat to Perun. */
export function rotationOf(data: HeroData): string[] {
  return data.tiers.map((t) => t.lead)
}

/** "jedyny na tym poziomie" / "2 komputery na tym poziomie" / "5 komputerów …" (board Main). */
export function siblingsText(count: number): string {
  if (count <= 1) return 'jedyny na tym poziomie'
  const last = count % 10
  const teen = count % 100 >= 12 && count % 100 <= 14
  const word = last >= 2 && last <= 4 && !teen ? 'komputery' : 'komputerów'
  return `${count} ${word} na tym poziomie`
}

/** "25.10.2026" in Polish time — the batch date under the price. */
export function dateText(iso: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(iso))
}

// ---------------------------------------------------------------------------------------------
// Sections 3–7 (G8, spec. §4). Same rule as the hero: public labels, sell prices and stored FPS
// numbers only.
// ---------------------------------------------------------------------------------------------

/** The 16 creature cards (spec. §4 pt 4: "w kolejności ceny"); without a price they go last. */
export function bestiaryOrder(builds: readonly HeroBuild[]): HeroBuild[] {
  return [...builds].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
}

/** Hint under each tier of the power scale (board Main, `.scale em`) — not in the data. */
export const TIER_HINTS: Record<number, string> = {
  1: 'Roblox, Minecraft, Fortnite, CS2',
  2: 'e-sport i nowe gry na wysokich',
  3: 'nowe gry w FullHD na wysokich',
  4: 'FullHD na ultra, 2K na wysokich',
  5: 'monitor 2K, 144 Hz',
  6: '2K, wysokie odświeżanie',
  7: 'monitor 4K',
  8: '4K na ultra',
  9: 'wszystko na maksimum',
}

/** One tier on the scale and in the games panel: the lead's colour and the names of the tier. */
export type HomeTier = {
  tier: number
  roman: string
  /** Realm of the lead level, e.g. "FullHD ultra / 2K". */
  label: string
  lead: string
  names: string
}

export function homeTiers(hero: HeroData): HomeTier[] {
  const bySlug = new Map(hero.builds.map((b) => [b.slug, b]))
  return hero.tiers.map((t) => ({
    tier: t.tier,
    roman: t.roman,
    label: bySlug.get(t.lead)?.tierLabel ?? '',
    lead: t.lead,
    names: t.builds.map((slug) => bySlug.get(slug)?.name ?? slug).join(', '),
  }))
}

/** The game picked first in "W co grasz?" and the resolution (board Main). */
export const PANEL_DEFAULT_GAME = 'cyberpunk-2077'
export const PANEL_DEFAULT_RESOLUTION: Resolution = 'qhd'

export type PanelGame = GameScale & { slug: string; name: string }

/**
 * "W co grasz?" — 33 games × 3 resolutions × 9 tiers, the number of each tier's lead build
 * (ADR-G004: a tier's FPS = its lead build's). Compact on purpose, it travels to the browser:
 * per resolution and game 9 numbers (`null` = no data) and 9 kind letters (`-` = no data).
 */
export type GamesPanelData = {
  games: PanelGame[]
  tiers: HomeTier[]
  fps: Record<Resolution, (number | null)[][]>
  kinds: Record<Resolution, string[]>
  /** Test setting per game, from its stored results (e.g. "Ultra, natywnie"). */
  settings: (string | null)[]
}

export function gamesPanel(
  hero: HeroData,
  games: readonly PanelGame[],
  table: FpsTable,
): GamesPanelData {
  const tiers = homeTiers(hero)
  const fps = { fullhd: [], qhd: [], uhd: [] } as GamesPanelData['fps']
  const kinds = { fullhd: [], qhd: [], uhd: [] } as GamesPanelData['kinds']
  const settings: (string | null)[] = []
  for (const game of games) {
    let setting: string | null = null
    for (const resolution of RESOLUTIONS) {
      const rows = tiers.map((t) => fpsFor(table, t.lead, game.slug, resolution))
      fps[resolution].push(rows.map((r) => r?.fps ?? null))
      kinds[resolution].push(rows.map((r) => r?.kind ?? '-').join(''))
      setting ??= rows.find((r) => r)?.setting ?? null
    }
    settings.push(setting)
  }
  return { games: [...games], tiers, fps, kinds, settings }
}

export type PanelRow = HomeTier & { fps: number; text: string; percent: number; kind: FpsKind }

/**
 * Rows of the panel for one game and resolution. Bars are relative to the best tier, at least 6%
 * (board Main `grows`); a tier without a number is left out — never a number we do not have.
 */
export function panelRows(data: GamesPanelData, game: number, resolution: Resolution): PanelRow[] {
  const values = data.fps[resolution][game] ?? []
  const kinds = data.kinds[resolution][game] ?? ''
  const scale = data.games[game]
  // `|| 1`: all zeros would divide by zero (NaN%); the 6% minimum then draws them.
  const max = Math.max(0, ...values.map((v) => v ?? 0)) || 1
  const rows: PanelRow[] = []
  data.tiers.forEach((tier, i) => {
    const fps = values[i]
    const kind = kinds[i]
    if (fps == null || !scale || !isKind(kind)) return
    rows.push({
      ...tier,
      fps,
      text: fpsText(fps, scale),
      percent: Math.max(6, Math.round((fps / max) * 100)),
      kind,
    })
  })
  return rows
}

const isKind = (value: string | undefined): value is FpsKind =>
  value === 'p' || value === 'm' || value === 'r' || value === 'e'

/** Games on the sample certificate (board Main `.doc-f`), measured at 2K. */
export const METRIC_GAMES = ['cyberpunk-2077', 'counter-strike-2', 'wiedzmin-3'] as const

/**
 * Sample certificate in "Zanim komputer wyjedzie z Rabki": the hero's default creature with its
 * stored 2K numbers and public part labels (no maker or model — that is on the real certificate).
 */
export type MetricSample = {
  name: string
  tierRoman: string
  cpu: string | null
  gpu: string | null
  rows: { name: string; text: string; percent: number; kind: FpsKind }[]
}

/** The three creatures of "Baba Jaga czy Wampir?" (board Main `.cmp`), in this order. */
export const COMPARE_BUILDS = ['kikimora', 'baba-jaga', 'wampir'] as const
export const COMPARE_GAME = 'cyberpunk-2077'
export const COMPARE_RESOLUTION: Resolution = 'qhd'

export type CompareCard = {
  slug: string
  key: string
  name: string
  tierRoman: string
  tierLabel: string
  photo: { src: string; alt: string } | null
  fps: number
  kind: FpsKind
  /** Bar height in % of the best of the three. */
  percent: number
  /** "+20% klatek" against the first creature (may be negative); `null` for the first. */
  gain: number | null
}

export type CompareData = { cards: CompareCard[]; game: string; setting: string | null }

/**
 * "Baba Jaga czy Wampir?": stored FPS of the three creatures in one game and resolution, and how
 * many more frames each gives than the first (board Main). Without a number for any of them the
 * teaser has nothing honest to show: `null`.
 */
export function compareTeaser(
  hero: HeroData,
  games: readonly PanelGame[],
  table: FpsTable,
): CompareData | null {
  const game = games.find((g) => g.slug === COMPARE_GAME)
  if (!game) return null
  const rows: { build: HeroBuild; fps: number; kind: FpsKind; setting: string }[] = []
  for (const slug of COMPARE_BUILDS) {
    const build = hero.builds.find((b) => b.slug === slug)
    const r = build && fpsFor(table, slug, COMPARE_GAME, COMPARE_RESOLUTION)
    if (!build || !r) return null
    rows.push({ build, fps: r.fps, kind: r.kind, setting: r.setting })
  }
  // "+X% klatek" only compares like with like: three results with different test settings
  // under one caption would mislead (ADR-G004) — then no chart at all.
  if (new Set(rows.map((r) => r.setting)).size > 1) return null
  const best = Math.max(...rows.map((r) => r.fps))
  const first = rows[0].fps
  return {
    game: game.name,
    setting: rows[0].setting,
    cards: rows.map((r, i) => ({
      slug: r.build.slug,
      key: r.build.key,
      name: r.build.name,
      tierRoman: r.build.tierRoman,
      tierLabel: r.build.tierLabel,
      photo: r.build.photo,
      fps: r.fps,
      kind: r.kind,
      percent: Math.round((r.fps / best) * 100),
      gain: i === 0 ? null : Math.round((r.fps / first - 1) * 100),
    })),
  }
}

/** A question of "Zanim zapytasz" (collection `faq`, group "Na stronie głównej"). */
export type HomeQuestion = { id: number; question: string; answer: string }

/** "+20% klatek", "+0% klatek", "−5% klatek" (typographic minus). */
export function gainText(gain: number): string {
  return `${gain < 0 ? '−' : '+'}${Math.abs(gain)}% klatek`
}

/** Everything the home page reads from the database. */
export type HomeData = {
  hero: HeroData
  /** `null` without games (empty database): the section keeps its text, no panel. */
  panel: GamesPanelData | null
  metric: MetricSample | null
  compare: CompareData | null
  /** Empty: the section "Zanim zapytasz" is left out. */
  faq: HomeQuestion[]
}

/** The database failed: the hero keeps its text and buttons, sections without data hide. */
export const EMPTY_HOME: HomeData = {
  hero: EMPTY_HERO,
  panel: null,
  metric: null,
  compare: null,
  faq: [],
}

export function metricSample(
  hero: HeroData,
  games: readonly PanelGame[],
  table: FpsTable,
): MetricSample | null {
  const build = hero.builds.find((b) => b.slug === HERO_DEFAULT)
  if (!build) return null
  const rows: MetricSample['rows'] = []
  for (const slug of METRIC_GAMES) {
    const game = games.find((g) => g.slug === slug)
    const r = game && fpsFor(table, build.slug, slug, 'qhd')
    if (!game || !r) continue
    rows.push({
      name: game.name,
      text: fpsText(r.fps, game),
      percent: barPercent(r.fps, game),
      kind: r.kind,
    })
  }
  return { name: build.name, tierRoman: build.tierRoman, cpu: build.cpu, gpu: build.gpu, rows }
}
