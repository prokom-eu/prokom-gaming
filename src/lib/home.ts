/**
 * Home hero data (spec. §4 pt 1, ADR-G003 §5). Browser-safe: the shapes below are everything the
 * hero's client component gets — public labels, sell prices and FPS numbers, never a cost or an
 * internal model (ADR-G002 §8.7). `lib/home.server.ts` reads the database and calls `buildHero()`.
 */
import { fpsFor, RESOLUTION_LABELS, type FpsKind, type FpsTable, type Resolution } from './fps'
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
