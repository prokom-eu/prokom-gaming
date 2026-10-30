/**
 * Configurator `/konfigurator` (spec. §7, ADR-G002 §5–§6, board Konfigurator). Browser-safe:
 * compatibility from `lib/compat.ts`, prices from the published snapshot (`lib/pricing/snapshot.ts`),
 * FPS from `fps-results` — no rule or price is decided here by an option code. Texts follow the
 * board's JS 1:1 where the board has them; reasons for greyed-out options are the ADR texts
 * (`compatMessage`). `lib/configurator.server.ts` reads the database.
 */
import { type LightKey } from './buildPage'
import { isLight } from './inquiry/types'
import {
  checkCompat,
  compatMessage,
  indexOffer,
  resolveParts,
  type CompatError,
  type OfferIndex,
} from './compat'
import { RESOLUTION_LABELS, type FpsKind, type FpsTable, type Resolution } from './fps'
import { signedZl, zl } from './pricing/format'
import { lookupPrice, priceFromSnapshot, surcharge, type PriceList } from './pricing/snapshot'
import {
  ITEM_CODE,
  type CompatLevel,
  type CompatOption,
  type Config,
  type OptionType,
} from './pricing/types'

// ---------------------------------------------------------------------------------------------
// Offer shapes. Generic on purpose: tests pass the seed catalog (with costs) — the page gets the
// public mapping from `configurator.server.ts` only.
// ---------------------------------------------------------------------------------------------

export type ConfOption = CompatOption & { active: boolean }

export type ConfOffer = {
  levels: readonly CompatLevel[]
  options: readonly ConfOption[]
}

/** A build as a recipe: the configurator recognises it and offers it as the nearest one. */
export type ConfBuild = { slug: string; name: string; config: Config }

/** A level as the power-level step needs it: its tier and its own build (FPS, „od”). */
export type TierLevel = { code: string; tier: number; build: string }

const SLOTS = ['case', 'cooler', 'ram', 'ssd'] as const satisfies readonly OptionType[]

// ---------------------------------------------------------------------------------------------
// Steps, monitor, games (board `NAMES`, `MON`, `GAMES`).
// ---------------------------------------------------------------------------------------------

export const STEPS = [
  { key: 'monitor', name: 'Monitor i gry' },
  { key: 'poziom', name: 'Poziom mocy' },
  { key: 'obudowa', name: 'Obudowa' },
  { key: 'chlodzenie', name: 'Chłodzenie' },
  { key: 'pamiec', name: 'Pamięć i dysk' },
  { key: 'podsumowanie', name: 'Podsumowanie' },
] as const

export type StepKey = (typeof STEPS)[number]['key']

export const MONITORS: readonly { resolution: Resolution; param: string; note: string }[] = [
  { resolution: 'fullhd', param: 'fullhd', note: '1920×1080, najpopularniejszy' },
  { resolution: 'qhd', param: '2k', note: '2560×1440, ostro i płynnie' },
  { resolution: 'uhd', param: '4k', note: '3840×2160, telewizor lub duży monitor' },
]

/** Game chips of step 1 (board: the first 14 games + four heavy ones), in board order. */
export const CONFIGURATOR_GAMES = [
  'counter-strike-2',
  'fortnite',
  'valorant',
  'league-of-legends',
  'minecraft',
  'roblox',
  'apex-legends',
  'pubg',
  'call-of-duty-warzone',
  'battlefield-6',
  'arc-raiders',
  'ea-sports-fc-27',
  'rust',
  'gta-v',
  'wiedzmin-3',
  'elden-ring',
  'spider-man-2',
  'cyberpunk-2077',
] as const

/** Board's starting choice. */
export const DEFAULT_GAMES = ['fortnite', 'counter-strike-2', 'cyberpunk-2077'] as const
/** FPS shown when no game is picked (board `sel`). */
const FALLBACK_GAMES = ['counter-strike-2', 'cyberpunk-2077'] as const
/** FPS in at most three games (board `slice(0, 3)`). */
export const FPS_GAMES_MAX = 3

/** The build the board starts with; also the fallback for a broken address. */
export const DEFAULT_BUILD = 'wampir'

/** Games whose FPS the configurator shows: the first three picked, or the board's fallback. */
export function shownGames(games: readonly string[]): string[] {
  return (games.length > 0 ? games : FALLBACK_GAMES).slice(0, FPS_GAMES_MAX)
}

/** Short name on the FPS tiles (board `short`). */
export function shortGameName(name: string): string {
  return name
    .replace('Call of Duty: ', '')
    .replace('Counter-Strike 2', 'CS2')
    .replace('Cyberpunk 2077', 'Cyberpunk')
    .replace('Red Dead Redemption 2', 'RDR 2')
}

// ---------------------------------------------------------------------------------------------
// State and address: `/konfigurator?krok=…&monitor=…&gry=…&k=…&swiatlo=…` (or `?zestaw=wampir`).
// ---------------------------------------------------------------------------------------------

export type ConfiguratorState = {
  step: StepKey
  monitor: Resolution
  games: string[]
  config: Config
  light: LightKey | null
}

const K_SEPARATOR = '.'

/** `P13.LB500.PL3LX.R32.NM1` — the same order as `Config`; codes never contain a dot. */
export function encodeConfig(config: Config): string {
  return [config.level, config.case, config.cooler, config.ram, config.ssd].join(K_SEPARATOR)
}

/** Codes from an address; `null` unless exactly five well-formed codes (not checked for sense). */
export function decodeConfig(k: string | null | undefined): Config | null {
  if (!k) return null
  const parts = k.split(K_SEPARATOR)
  if (parts.length !== 5 || !parts.every((p) => ITEM_CODE.test(p))) return null
  const [level, caseCode, cooler, ram, ssd] = parts as [string, string, string, string, string]
  return { level, case: caseCode, cooler, ram, ssd }
}

const isStep = (v: string | null): v is StepKey => STEPS.some((s) => s.key === v)

/** Every code active, published and of the right type; the rules are checked separately. */
function sellable(config: Config, offer: ConfOffer, prices: PriceList): boolean {
  const index = indexOffer(offer.levels, offer.options)
  const parts = resolveParts(config, index)
  if (!parts) return false
  if (![parts.case, parts.cooler, parts.ram, parts.ssd].every((o) => o.active)) return false
  return priceFromSnapshot(config, prices) !== null
}

/** No rule broken (ADR-G002 §5). */
function valid(config: Config, offer: ConfOffer): boolean {
  const parts = resolveParts<CompatLevel, ConfOption>(
    config,
    indexOffer(offer.levels, offer.options),
  )
  return parts !== null && checkCompat(parts).errors.length === 0
}

export type ParsedState = {
  state: ConfiguratorState
  /** What the configurator changed in a broken address (same text as a level change). */
  changes: SlotChange[]
}

/**
 * State from the address. Nothing from the address is trusted: unknown or inactive codes, an
 * unknown build or garbage fall back to the board's start (Wampir, or the first sellable build); a
 * valid but incompatible configuration is repaired like a level change (`repairConfig`) and the
 * changes are reported. `null` when no build can be sold (nothing published yet) — the page then
 * shows no configurator.
 */
export function parseState(
  params: URLSearchParams,
  ctx: {
    offer: ConfOffer
    builds: readonly ConfBuild[]
    prices: PriceList
    games: readonly string[]
  },
): ParsedState | null {
  const monitorParam = params.get('monitor')
  const monitor = MONITORS.find((m) => m.param === monitorParam)?.resolution ?? 'qhd'

  const gry = params.get('gry')
  const known = new Set(ctx.games)
  const games =
    gry === null
      ? [...DEFAULT_GAMES].filter((g) => known.has(g))
      : [...new Set(gry.split(',').filter((g) => known.has(g)))]

  const swiatlo = params.get('swiatlo')
  const light = isLight(swiatlo) ? swiatlo : null

  const usable = (c: Config) => sellable(c, ctx.offer, ctx.prices) && valid(c, ctx.offer)
  const fallback = [...ctx.builds]
    .sort((a, b) => Number(b.slug === DEFAULT_BUILD) - Number(a.slug === DEFAULT_BUILD))
    .find((b) => usable(b.config))
  if (!fallback) return null

  const fromBuild = ctx.builds.find((b) => b.slug === params.get('zestaw'))
  const krok = params.get('krok')
  const step: StepKey = isStep(krok) ? krok : fromBuild ? 'poziom' : 'monitor'

  let config = fromBuild?.config ?? decodeConfig(params.get('k')) ?? fallback.config
  let changes: SlotChange[] = []
  if (!sellable(config, ctx.offer, ctx.prices)) {
    config = fallback.config
  } else {
    const repaired = repairConfig(config, ctx.offer, ctx.prices)
    if (repaired) {
      config = repaired.config
      changes = repaired.changes
    } else {
      config = fallback.config
    }
  }
  return { state: { step, monitor, games, config, light }, changes }
}

/** Query string of a state (without `?`); `zestaw` is never written back — `k` says it all. */
export function stateQuery(state: ConfiguratorState): string {
  const params = new URLSearchParams()
  params.set('krok', state.step)
  params.set('monitor', MONITORS.find((m) => m.resolution === state.monitor)?.param ?? '2k')
  params.set('gry', state.games.join(','))
  params.set('k', encodeConfig(state.config))
  if (state.light) params.set('swiatlo', state.light)
  return params.toString()
}

/** Longest text of „Inna obudowa / chłodzenie” carried to the inquiry form. */
export const OTHER_PART_MAX = 200

/**
 * „Zapytaj o tę konfigurację” → `/zapytanie?k=…[&swiatlo=…][&inne=…]`; the form reads `k` as the
 * configuration, `swiatlo` as the light colour and `inne` into the notes (`lib/inquiry/form.ts`).
 */
export function configInquiryHref(config: Config, light: LightKey | null, other = ''): string {
  const params = new URLSearchParams({ k: encodeConfig(config) })
  if (light) params.set('swiatlo', light)
  // By code points, so an emoji is never cut in half.
  const text = Array.from(other.trim()).slice(0, OTHER_PART_MAX).join('')
  if (text) params.set('inne', text)
  return `/zapytanie?${params.toString()}`
}

// ---------------------------------------------------------------------------------------------
// Options of one step: greyed out with a reason, surcharge against the current choice.
// ---------------------------------------------------------------------------------------------

/** Which rules belong to which slot (ADR-G002 §5): a level change repairs slot by slot. */
const SLOT_ERRORS: Record<OptionType, readonly CompatError[]> = {
  case: ['gpu_too_long', 'case_class_too_low'],
  cooler: ['cooler_too_tall', 'no_aio_mount', 'requires_aio', 'cooler_class_too_low'],
  ram: ['ram_type', 'ram_too_small'],
  ssd: ['ssd_too_small'],
}

export type OptionState = {
  code: string
  selected: boolean
  /** Greyed out: the reason is shown, never hidden (ADR-G002 §6). */
  disabled: boolean
  reason: string | null
  /** Against the current choice (0 for it). */
  surcharge: number
}

/**
 * Every active, published option of a slot with its state, the selectable ones first (board
 * `sort(off)`), otherwise in offer order. RAM lists only the level's memory type (board: „Pamięć
 * RAM DDR5”, the heading says why). The current configuration is valid, so an error of a
 * candidate is caused by the candidate.
 */
export function optionStates(
  slot: OptionType,
  config: Config,
  offer: ConfOffer,
  prices: PriceList,
): OptionState[] {
  const index = indexOffer(offer.levels, offer.options)
  const level = index.level.get(config.level)
  if (!level) return []
  const states: OptionState[] = []
  for (const option of offer.options) {
    if (option.type !== slot || !option.active) continue
    if (option.type === 'ram' && option.ramType !== level.ramType) continue
    const extra = surcharge(prices, config[slot], option.code)
    if (extra === null) continue
    const parts = resolveParts({ ...config, [slot]: option.code }, index)
    if (!parts) continue
    const error = checkCompat(parts).errors[0]
    states.push({
      code: option.code,
      selected: option.code === config[slot],
      disabled: error !== undefined,
      reason: error ? compatMessage(error, level) : null,
      surcharge: extra,
    })
  }
  return [...states.filter((s) => !s.disabled), ...states.filter((s) => s.disabled)]
}

/** Non-blocking warnings of the current configuration (ADR-G002 §5), as texts. */
export function configWarnings(config: Config, offer: ConfOffer): string[] {
  const index = indexOffer(offer.levels, offer.options)
  const parts = resolveParts(config, index)
  if (!parts) return []
  return checkCompat(parts).warnings.map((w) => compatMessage(w, parts.level))
}

// ---------------------------------------------------------------------------------------------
// Level change with the choice kept (ADR-G002 §6, board `pickLevel` / `chooseLevel`).
// ---------------------------------------------------------------------------------------------

export type SlotChange = {
  slot: OptionType
  from: string
  to: string
  /** Why the old option no longer fits (`compatMessage`). */
  reason: string
  surcharge: number
}

type Index = OfferIndex<CompatLevel, ConfOption>

const slotErrors = (config: Config, slot: OptionType, index: Index): CompatError[] => {
  const parts = resolveParts<CompatLevel, ConfOption>(config, index)
  if (!parts) return [...SLOT_ERRORS[slot]]
  return checkCompat(parts).errors.filter((e) => SLOT_ERRORS[slot].includes(e))
}

/**
 * Replace every option that breaks a rule with the cheapest one that keeps the slot valid (RAM and
 * SSD: the capacity nearest to the current one that meets the minimum, then the price — ADR-G002
 * §6; 32 GB DDR5 → 32 GB DDR4, 16 GB below a 32 GB minimum → 32 GB). A replacement case also
 * prefers one that keeps the current cooler. `null` when no valid configuration can be reached.
 */
export function repairConfig(
  config: Config,
  offer: ConfOffer,
  prices: PriceList,
): { config: Config; changes: SlotChange[] } | null {
  const index: Index = indexOffer(offer.levels, offer.options)
  const level = index.level.get(config.level)
  if (!level) return null
  let current = { ...config }
  const changes: SlotChange[] = []

  for (const slot of SLOTS) {
    const errors = slotErrors(current, slot, index)
    const first = errors[0]
    if (!first) continue
    const was = index[slot].get(current[slot])
    const wasCapacity = was && (was.type === 'ram' || was.type === 'ssd') ? was.capacityGb : 0
    const candidates = offer.options
      .filter(
        (o) => o.type === slot && o.active && lookupPrice(prices.option, o.code) !== undefined,
      )
      .filter((o) => slot !== 'ram' || (o.type === 'ram' && o.ramType === level.ramType))
      .map((o) => {
        const next = { ...current, [slot]: o.code }
        const parts = resolveParts<CompatLevel, ConfOption>(next, index)
        const all = parts ? checkCompat(parts).errors : [...SLOT_ERRORS[slot]]
        return {
          code: o.code,
          distance: o.type === 'ram' || o.type === 'ssd' ? Math.abs(o.capacityGb - wasCapacity) : 0,
          price: lookupPrice(prices.option, o.code)!,
          own: all.filter((e) => SLOT_ERRORS[slot].includes(e)).length,
          other: all.length,
        }
      })
      .filter((c) => c.own === 0)
      .sort((a, b) => a.other - b.other || a.distance - b.distance || a.price - b.price)
    const best = candidates[0]
    if (!best) return null
    changes.push({
      slot,
      from: current[slot],
      to: best.code,
      reason: compatMessage(first, level),
      surcharge: surcharge(prices, current[slot], best.code) ?? 0,
    })
    current = { ...current, [slot]: best.code }
  }

  const parts = resolveParts<CompatLevel, ConfOption>(current, index)
  if (!parts || checkCompat(parts).errors.length > 0) return null
  // The level itself needs a published price too (e.g. added in the panel after the last batch).
  if (priceFromSnapshot(current, prices) === null) return null
  return { config: current, changes }
}

/**
 * Choose another level. An unchanged build (the choice is exactly a recipe) moves to the new
 * level's own build; otherwise the choice is kept and only what stopped fitting is replaced.
 */
export function switchLevel(
  config: Config,
  levelCode: string,
  ctx: { offer: ConfOffer; builds: readonly ConfBuild[]; prices: PriceList },
): { config: Config; changes: SlotChange[]; keptChoice: boolean } | null {
  const target = levelBuild(levelCode, ctx.builds)
  // The new level's recipe, only when it can be sold as it is (active, published, valid).
  const recipe =
    target && sellable(target.config, ctx.offer, ctx.prices) && valid(target.config, ctx.offer)
      ? { config: target.config, changes: [], keptChoice: false }
      : null
  if (matchBuild(config, ctx.builds) && recipe) return recipe
  const repaired = repairConfig({ ...config, level: levelCode }, ctx.offer, ctx.prices)
  if (repaired) return { ...repaired, keptChoice: true }
  return recipe
}

const SLOT_NAMES: Record<OptionType, string> = {
  case: 'obudowa',
  cooler: 'chłodzenie',
  ram: 'RAM',
  ssd: 'dysk',
}

/**
 * The message after a level change (board `toast`), with the reason and the surcharge of each
 * change (ADR-G002 §6: „co i dlaczego”). `null` when the level moved to its own build.
 */
export function levelChangeMessage(
  tierLabel: string,
  result: { changes: readonly SlotChange[]; keptChoice: boolean },
  label: (code: string) => string,
): string | null {
  if (!result.keptChoice) return null
  if (result.changes.length === 0) {
    return 'Zachowaliśmy Twoje wybory obudowy, chłodzenia, pamięci i dysku.'
  }
  const parts = result.changes.map(
    (c) =>
      `${SLOT_NAMES[c.slot]} → ${label(c.to)} (${lowerFirst(c.reason)}, ${signedZl(c.surcharge)})`,
  )
  return `Zachowaliśmy Twoje wybory. ${tierLabel} wymaga zmian, więc dopasowaliśmy: ${parts.join('; ')}.`
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

// ---------------------------------------------------------------------------------------------
// Ready builds: exact match and the nearest one (ADR-G002 §6).
// ---------------------------------------------------------------------------------------------

const sameConfig = (a: Config, b: Config) =>
  a.level === b.level &&
  a.case === b.case &&
  a.cooler === b.cooler &&
  a.ram === b.ram &&
  a.ssd === b.ssd

export function matchBuild(config: Config, builds: readonly ConfBuild[]): ConfBuild | null {
  return builds.find((b) => sameConfig(b.config, config)) ?? null
}

/** The ready build of a level (one per level) — the configurator's „najbliższy gotowiec”. */
export function levelBuild(levelCode: string, builds: readonly ConfBuild[]): ConfBuild | null {
  return builds.find((b) => b.config.level === levelCode) ?? null
}

export type BuildMatch = {
  exact: boolean
  build: ConfBuild
  /** Configuration minus the ready build. */
  diff: number
  title: string
  text: string
  short: string
  /** Name in the side panel. */
  sideName: string
}

/** Texts of the board (`matchT`, `matchD`, `matchShort`, `sideName`). `null` without prices. */
export function buildMatch(
  config: Config,
  builds: readonly ConfBuild[],
  prices: PriceList,
): BuildMatch | null {
  const build = levelBuild(config.level, builds)
  if (!build) return null
  const price = priceFromSnapshot(config, prices)
  const buildPrice = priceFromSnapshot(build.config, prices)
  if (price === null || buildPrice === null) return null
  const exact = sameConfig(config, build.config)
  const diff = price - buildPrice
  return exact
    ? {
        exact,
        build,
        diff,
        title: `To dokładnie ${build.name}, nasz gotowy zestaw`,
        text: 'Taka sama cena jak na stronie zestawu. Gotowy zestaw wysyłamy najszybciej.',
        short: `To dokładnie ${build.name}`,
        sideName: build.name,
      }
    : {
        exact,
        build,
        diff,
        title: `Twoja konfiguracja na bazie: ${build.name}`,
        text: `Gotowy ${build.name} kosztuje ${zl(buildPrice)} (${signedZl(-diff)} względem Twojej konfiguracji).`,
        short: `Konfiguracja własna · ${signedZl(diff)} vs ${build.name}`,
        sideName: `${build.name} po zmianach`,
      }
}

// ---------------------------------------------------------------------------------------------
// Step 1: recommendation (board `RECO`, `recoWhy`).
// ---------------------------------------------------------------------------------------------

/** Build recommended for a monitor: e-sport only, or with a demanding game on the list. */
const RECOMMENDED: Record<Resolution, { esport: string; heavy: string }> = {
  fullhd: { esport: 'licho', heavy: 'strzyga' },
  qhd: { esport: 'kikimora', heavy: 'baba-jaga' },
  uhd: { esport: 'wampir', heavy: 'weles' },
}

/** A game that is not e-sport (AAA or capped) makes the list „demanding” (board `heavy`). */
export function hasHeavyGame(
  games: readonly string[],
  kinds: Readonly<Record<string, 'esport' | 'aaa' | 'capped'>>,
): boolean {
  return games.some((g) => Object.hasOwn(kinds, g) && kinds[g] !== 'esport')
}

export function recommendation(
  monitor: Resolution,
  heavy: boolean,
): { build: string; why: string } {
  const build = heavy ? RECOMMENDED[monitor].heavy : RECOMMENDED[monitor].esport
  const why =
    (heavy ? 'Masz na liście gry z wymagającą grafiką' : 'Grasz głównie w e-sport') +
    `, monitor ${RESOLUTION_LABELS[monitor]}. Ten poziom da płynną grę bez przepłacania.`
  return { build, why }
}

// ---------------------------------------------------------------------------------------------
// FPS: a compact table for the browser and the source note (board `fpsRows`, `monitorNote`).
// ---------------------------------------------------------------------------------------------

export type FpsCell = { fps: number; kind: FpsKind }
/** `build|game|resolution` → number and source kind: what the configurator shows, nothing more. */
export type CompactFps = Record<string, FpsCell>

const fpsKey = (build: string, game: string, resolution: Resolution) =>
  `${build}|${game}|${resolution}`

export function compactFps(table: FpsTable, games: readonly string[]): CompactFps {
  const wanted = new Set(games)
  const out: CompactFps = {}
  for (const r of Object.values(table)) {
    if (!wanted.has(r.game)) continue
    out[fpsKey(r.build, r.game, r.resolution)] = { fps: r.fps, kind: r.kind }
  }
  return out
}

export function fpsCell(
  table: CompactFps,
  build: string,
  game: string,
  resolution: Resolution,
): FpsCell | null {
  const key = fpsKey(build, game, resolution)
  return Object.hasOwn(table, key) ? table[key]! : null
}

/** „monitor 2K, najwyższe ustawienia, bez skalowania; 2 z testów, 1 szacunek” (board). */
export function fpsNote(cells: readonly (FpsCell | null)[], monitor: Resolution): string {
  const known = cells.filter((c): c is FpsCell => c !== null)
  const estimates = known.filter((c) => c.kind === 'e').length
  const base = `monitor ${RESOLUTION_LABELS[monitor]}, najwyższe ustawienia, bez skalowania`
  // No number shown: no source to name (ADR-G004 — a label must match the data).
  if (known.length === 0) return base
  const source =
    estimates === 0
      ? 'wyniki z testów niezależnych'
      : estimates === known.length
        ? 'szacunek (brak testu tej gry z naszą kartą)'
        : `${known.length - estimates} z testów, ${estimates} szacunek`
  return `${base}; ${source}`
}

// ---------------------------------------------------------------------------------------------
// Step 2: power levels in nine tier rows (board `tierRows`).
// ---------------------------------------------------------------------------------------------

/** One line under the tier name (board `NOTE`). */
export const TIER_NOTES: Record<number, string> = {
  1: 'Roblox, Minecraft, Fortnite, CS2',
  2: 'e-sport na wysokich',
  3: 'nowe gry w FullHD',
  4: 'FullHD na ultra, 2K na wysokich',
  5: 'monitor 2K, 144 Hz',
  6: '2K, wysokie odświeżanie',
  7: 'monitor 4K',
  8: '4K na ultra',
  9: 'wszystko na maksimum',
}

export type TierRow = {
  tier: number
  /** Codes of the tier's levels (variants), in offer order. */
  levels: string[]
  /** The level drawn: the chosen one, otherwise the first of the tier. */
  shown: string
  selected: boolean
  /** „od 4 960 zł” = `level_from` of the shown level; `null` without a price. */
  from: number | null
  /** „Poziom wyżej: +630 zł za ok. +51% klatek w Twoich grach”. */
  upgrade: string
}

/**
 * Nine rows; the „one tier up” line compares the shown level with the cheapest level of the next
 * tier: price from `level_from`, FPS summed over the shown games at the monitor's resolution. A
 * game without a number for either level is left out of the sum — no number is guessed.
 */
export function tierRows(input: {
  levels: readonly TierLevel[]
  current: string
  games: readonly string[]
  monitor: Resolution
  fps: CompactFps
  levelFrom: Readonly<Record<string, number>>
}): TierRow[] {
  const tiers = [...new Set(input.levels.map((l) => l.tier))].sort((a, b) => a - b)
  const groups = tiers.map((t) => input.levels.filter((l) => l.tier === t))
  const from = (l: TierLevel) => lookupPrice(input.levelFrom, l.code) ?? null
  const cell = (l: TierLevel, game: string) => fpsCell(input.fps, l.build, game, input.monitor)

  return groups.map((group, i) => {
    const chosen = group.find((l) => l.code === input.current)
    const shown = chosen ?? group[0]!
    const nextGroup = groups[i + 1]
    let upgrade = 'Najmocniejszy komputer, jaki składamy'
    if (nextGroup) {
      const priced = nextGroup.filter((l) => from(l) !== null)
      const next = priced.reduce<TierLevel | null>(
        (best, l) => (best === null || from(l)! < from(best)! ? l : best),
        null,
      )
      const shownFrom = from(shown)
      if (next && shownFrom !== null) {
        let base = 0
        let up = 0
        for (const game of input.games) {
          const a = cell(shown, game)
          const b = cell(next, game)
          if (!a || !b) continue
          base += a.fps
          up += b.fps
        }
        const price = `Poziom wyżej: ${signedZl(from(next)! - shownFrom)}`
        if (base === 0) {
          upgrade = price
        } else {
          const gain = Math.round((up / base - 1) * 100)
          upgrade =
            gain >= 3
              ? `${price} za ok. +${gain}% klatek w Twoich grach`
              : `${price}, głównie mocniejszy procesor`
        }
      } else {
        upgrade = ''
      }
    }
    return {
      tier: shown.tier,
      levels: group.map((l) => l.code),
      shown: shown.code,
      selected: chosen !== undefined,
      from: from(shown),
      upgrade,
    }
  })
}

// ---------------------------------------------------------------------------------------------
// Steps 3–5: filters and texts (board `CF`, `coolTabs`, `coolIntro`, `USE`, `SUSE`).
// ---------------------------------------------------------------------------------------------

export const CASE_FILTERS = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'pan', label: 'Szkło panoramiczne' },
  { key: 'mesh', label: 'Siatka, najlepszy przepływ' },
  { key: 'white', label: 'Białe' },
] as const

export type CaseFilter = (typeof CASE_FILTERS)[number]['key']

/** The board filters by words of the description and by colour — there are no other fields. */
export function caseMatches(
  filter: CaseFilter,
  item: { description: string | null; color: string | null },
): boolean {
  const description = item.description ?? ''
  switch (filter) {
    case 'all':
      return true
    case 'pan':
      return description.includes('panoram')
    case 'mesh':
      return description.includes('siatka')
    case 'white':
      return item.color === 'biały'
  }
}

export const COOLER_TABS = [
  { key: 'aio360', label: 'Wodne AIO 360' },
  { key: 'air', label: 'Powietrzne' },
] as const

/** The intro of the cooler step (board `coolIntro`). */
export function coolerIntro(
  level: Pick<CompatLevel, 'requiresAio'>,
  caseItem: { label: string; coolerMaxMm: number; aio360: string },
): string {
  if (level.requiresAio) return 'Ten procesor potrzebuje chłodzenia wodnego 360 mm.'
  const fits =
    caseItem.aio360 !== 'none'
      ? ` (mieści AIO 360, cooler do ${caseItem.coolerMaxMm} mm).`
      : ` (cooler do ${caseItem.coolerMaxMm} mm, bez miejsca na AIO 360).`
  return `Pokazujemy tylko chłodzenia, które pasują do obudowy ${caseItem.label}${fits}`
}

/** What a RAM size or a disk is for (board `USE`, `SUSE`). */
export const RAM_USE: Record<number, string> = {
  16: 'e-sport i większość gier',
  32: 'złoty standard do gier',
  64: 'gry, stream i montaż',
}
export const SSD_USE: Record<number, string> = {
  512: 'system i kilka gier',
  1000: 'kilkanaście dużych gier',
  2000: 'cała biblioteka gier',
}

/** „32 GB”, „1 TB”. */
export const capacityText = (gb: number) => (gb >= 1000 ? `${gb / 1000} TB` : `${gb} GB`)
