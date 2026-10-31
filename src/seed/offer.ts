/**
 * Offer data from seed/prokomgaming/ mapped to Payload documents (G3). Pure functions, no
 * database: the runner (`index.ts`) resolves relations and writes; `offer.test.ts` checks them.
 * Seed-only keys are never copied: `_check` (sheet results for tests), `_verify` (a note shown as
 * the panel description of `upgrade`), `aio360Raw` and `serviceCostBreakdown` (informational).
 */
import type { PriceRow } from '../lib/pricing/catalog'
import { SERVICE_CODE } from '../lib/pricing/types'
import type { Build, Option, PowerLevel, PricingSetting, SiteSetting } from '../payload-types'
import pricingExpected from '../../tests/fixtures/pricing-expected.json'
import buildsSeed from '../../seed/prokomgaming/builds.json'
import creaturesSeed from '../../seed/prokomgaming/creatures.json'
import optionsSeed from '../../seed/prokomgaming/options.json'
import powerLevelsSeed from '../../seed/prokomgaming/power-levels.json'
import pricingSettingsSeed from '../../seed/prokomgaming/pricing-settings.json'
import siteSettingsSeed from '../../seed/prokomgaming/site-settings.json'

// --- Seed rows (the JSON shape, 1:1 with the sheet export) ---

type SeedComponent = {
  role: 'cpu' | 'gpu' | 'mobo' | 'psu'
  publicLabel: string
  internalModel: string
  ean?: string
  cost: number
}

export type SeedPowerLevel = {
  code: string
  tier: number
  tierRoman: string
  tierLabel: string
  tierLead: boolean
  targetResolution: PowerLevel['targetResolution']
  monitorFilters: PowerLevel['monitorFilters']
  variant: string
  publicLabel: string
  platform: PowerLevel['platform']
  ramType: PowerLevel['ramType']
  color: PowerLevel['color']
  gpuLengthMm: number
  requiresAio: boolean
  components: SeedComponent[]
  upgrade: {
    freeRamSlots: number
    freeM2Slots: string
    socket: string
    socketNote: string
    psuW: number
  }
  markupClass: keyof typeof MARKUP_CLASS
  markupOverride?: number | null
  minRamGb: number
  minSsdGb: number
  minCoolerClass: number
  minCaseClass: number
  leadBuild: string
  _check: { sell: number }
}

export type SeedOption = {
  type: Option['type']
  code: string
  publicLabel: string
  internalModel: string
  ean?: string
  cost: number
  active?: boolean
  image?: string
  description?: string | null
  gpuMaxMm?: number
  coolerMaxMm?: number
  aio360?: NonNullable<Option['aio360']>
  kind?: NonNullable<Option['kind']>
  heightMm?: number
  radiatorThicknessMm?: number
  class?: number
  color?: NonNullable<Option['color']>
  ramType?: NonNullable<Option['ramType']>
  capacityGb?: number
  _check: { sell: number }
}

export type SeedBuild = {
  slug: string
  name: string
  creature: string
  level: string
  case: string
  cooler: string
  ram: string
  ssd: string
  internalRef: string
}

export type SeedCreature = {
  slug: string
  id: string
  accusative: string
  genitive: string
  shell: Build['creature']['shell']
  biome: string
  look: string
  epithet: string
  short: string
  motto: string
  myth: string
  why: string
  giftTitle: string
  gift: string
  heroTitle: string
  heroText: string
  legend: string
  legendSource: { title: string; url: string }
}

export const seed = {
  levels: powerLevelsSeed.items as SeedPowerLevel[],
  options: optionsSeed.items as SeedOption[],
  builds: buildsSeed.items as SeedBuild[],
  creatures: creaturesSeed.items as SeedCreature[],
  pricingSettings: pricingSettingsSeed,
  siteSettings: siteSettingsSeed,
}

// Sheet names of markup classes → keys of `pricing-settings.levelMarkupByClass`.
const MARKUP_CLASS = {
  FullHD: 'fullhd',
  '2K': 'qhd',
  '4K': 'uhd',
  flagowiec: 'flagship',
} as const satisfies Record<string, PowerLevel['markupClass']>

// --- Documents ---

type DocData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>

export type OptionData = DocData<Option>

export function mapOption(o: SeedOption, imageId: number | null): OptionData {
  return {
    type: o.type,
    code: o.code,
    active: o.active ?? true,
    publicLabel: o.publicLabel,
    internalModel: o.internalModel,
    ean: o.ean ?? null,
    cost: o.cost,
    image: imageId,
    description: o.description ?? null,
    gpuMaxMm: o.gpuMaxMm ?? null,
    coolerMaxMm: o.coolerMaxMm ?? null,
    aio360: o.aio360 ?? null,
    kind: o.kind ?? null,
    heightMm: o.heightMm ?? null,
    radiatorThicknessMm: o.radiatorThicknessMm ?? null,
    class: o.class ?? null,
    color: o.color ?? null,
    ramType: o.ramType ?? null,
    capacityGb: o.capacityGb ?? null,
  }
}

/** Without `leadBuild`: builds do not exist yet when levels are written (set in a second pass). */
export type PowerLevelData = Omit<DocData<PowerLevel>, 'leadBuild'>

export function mapPowerLevel(p: SeedPowerLevel): PowerLevelData {
  return {
    code: p.code,
    tier: p.tier,
    tierRoman: p.tierRoman,
    tierLabel: p.tierLabel,
    tierLead: p.tierLead,
    targetResolution: p.targetResolution,
    monitorFilters: p.monitorFilters,
    // '' in the sheet = no variant.
    variant: (p.variant || null) as PowerLevel['variant'],
    publicLabel: p.publicLabel,
    platform: p.platform,
    ramType: p.ramType,
    color: p.color,
    gpuLengthMm: p.gpuLengthMm,
    requiresAio: p.requiresAio,
    components: p.components.map((c) => ({
      role: c.role,
      publicLabel: c.publicLabel,
      internalModel: c.internalModel,
      ean: c.ean ?? null,
      cost: c.cost,
    })),
    upgrade: {
      freeRamSlots: p.upgrade.freeRamSlots,
      freeM2Slots: p.upgrade.freeM2Slots,
      socket: p.upgrade.socket,
      socketNote: p.upgrade.socketNote,
      psuW: p.upgrade.psuW,
    },
    markupClass: MARKUP_CLASS[p.markupClass],
    markupOverride: p.markupOverride ?? null,
    minRamGb: p.minRamGb,
    minSsdGb: p.minSsdGb,
    minCoolerClass: p.minCoolerClass,
    minCaseClass: p.minCaseClass,
  }
}

export type BuildRefs = { level: number; case: number; cooler: number; ram: number; ssd: number }
export type BuildData = DocData<Build>

export function mapBuild(b: SeedBuild, c: SeedCreature, refs: BuildRefs): BuildData {
  return {
    slug: b.slug,
    name: b.name,
    ...refs,
    creature: {
      key: c.id,
      accusative: c.accusative,
      genitive: c.genitive,
      epithet: c.epithet,
      shell: c.shell,
      biome: c.biome,
      look: c.look,
      short: c.short,
      motto: c.motto,
      myth: c.myth,
      why: c.why,
      giftTitle: c.giftTitle,
      gift: c.gift,
      heroTitle: c.heroTitle,
      heroText: c.heroText,
      legend: c.legend,
      legendSource: { title: c.legendSource.title, url: c.legendSource.url },
    },
    internalRef: b.internalRef,
  }
}

export function mapPricingSettings(s: typeof pricingSettingsSeed): DocData<PricingSetting> {
  return {
    minMargin: s.minMargin,
    // Not in the price sheet: the panel's default warning threshold (panel spec §2, P1).
    warnMargin: 0.12,
    publishThreshold: s.publishThreshold,
    // Publication is always manual (P1): never seed `autoPublish` on, whatever the sheet says.
    autoPublish: false,
    serviceCost: s.serviceCost,
    caseCoolerBuffer: s.caseCoolerBuffer,
    whiteSurcharge: s.whiteSurcharge,
    roundingStep: s.roundingStep,
    categoryMarkup: { ...s.categoryMarkup },
    levelMarkupByClass: {
      fullhd: s.levelMarkupByClass.FullHD,
      qhd: s.levelMarkupByClass['2K'],
      uhd: s.levelMarkupByClass['4K'],
      flagship: s.levelMarkupByClass.flagowiec,
    },
  }
}

export function mapSiteSettings(s: typeof siteSettingsSeed): DocData<SiteSetting> {
  const { _info: _ignored, ...settings } = s
  return settings
}

// --- First price publication (ADR-G002 §2) ---

// Shared with price publication in the panel (G4): one code for the service, one row shape.
export { SERVICE_CODE }
export type { PriceRow }

/**
 * The first batch of published prices, as of `pricing-settings.priceDate` (25.10.2026). Sell
 * prices come from the sheet (`_check.sell`, fixtures `serviceSell` and `priceFrom`), not from
 * code: `lib/pricing/` arrives in G4, whose tests must reproduce these numbers. "Price from" has no
 * single cost, so `costAtPublish` stays empty for it.
 */
export function firstBatch(): PriceRow[] {
  const levels = seed.levels.map<PriceRow>((p) => ({
    itemType: 'level',
    itemCode: p.code,
    sellPrice: p._check.sell,
    costAtPublish: p.components.reduce((sum, c) => sum + c.cost, 0),
  }))
  const options = seed.options.map<PriceRow>((o) => ({
    itemType: 'option',
    itemCode: o.code,
    sellPrice: o._check.sell,
    costAtPublish: o.cost,
  }))
  const service: PriceRow = {
    itemType: 'service',
    itemCode: SERVICE_CODE,
    sellPrice: pricingExpected.serviceSell,
    costAtPublish: seed.pricingSettings.serviceCost,
  }
  const priceFrom = pricingExpected.priceFrom as Record<string, number>
  const levelFrom = seed.levels.map<PriceRow>((p) => {
    const sellPrice = priceFrom[p.code]
    if (sellPrice === undefined) throw new Error(`No "price from" for level ${p.code} in fixtures.`)
    return { itemType: 'level_from', itemCode: p.code, sellPrice, costAtPublish: null }
  })
  return [...levels, ...options, service, ...levelFrom]
}

/**
 * Midday UTC of the price date: the same calendar day in Poland whatever the DST. Only the date is
 * shown ("Cena z dnia …").
 */
export function firstBatchPublishedAt(): string {
  return `${seed.pricingSettings.priceDate}T12:00:00.000Z`
}
