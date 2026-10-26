import 'server-only'

import type { Option, PowerLevel, PricingSetting } from '../../payload-types'
import type { CompatCase, CompatCooler, CompatLevel, CompatRam, CompatSsd } from './types'

/**
 * The offer with costs, in the shape the cost layer works on (ADR-G002 §2–§3). Built from Payload
 * documents (panel, publication) or from the seed mapped the same way (tests) — one path, so the
 * tests check the code that prices the real data. Server-only: it carries costs and markups.
 */

export type PricingSettingsInput = Pick<
  PricingSetting,
  | 'minMargin'
  // Not used by the formulas: the publication queue (G4, part 2) compares candidates with it.
  | 'publishThreshold'
  | 'serviceCost'
  | 'caseCoolerBuffer'
  | 'whiteSurcharge'
  | 'roundingStep'
  | 'categoryMarkup'
  | 'levelMarkupByClass'
>

export type CostLevel = CompatLevel & {
  color: PowerLevel['color']
  markupClass: PowerLevel['markupClass']
  markupOverride: number | null
  /** Sum of the CPU, GPU, motherboard and PSU costs. */
  partsCost: number
}

type Costed<T> = T & { cost: number; active: boolean }
export type CostCase = Costed<CompatCase>
export type CostCooler = Costed<CompatCooler>
export type CostRam = Costed<CompatRam>
export type CostSsd = Costed<CompatSsd>
export type CostOption = CostCase | CostCooler | CostRam | CostSsd

export type Catalog = {
  levels: CostLevel[]
  options: CostOption[]
  settings: PricingSettingsInput
}

export type LevelDoc = Pick<
  PowerLevel,
  | 'code'
  | 'ramType'
  | 'gpuLengthMm'
  | 'requiresAio'
  | 'minRamGb'
  | 'minSsdGb'
  | 'minCoolerClass'
  | 'minCaseClass'
  | 'color'
  | 'markupClass'
  | 'markupOverride'
  | 'components'
>

export type OptionDoc = Pick<
  Option,
  | 'type'
  | 'code'
  | 'active'
  | 'cost'
  | 'gpuMaxMm'
  | 'coolerMaxMm'
  | 'aio360'
  | 'kind'
  | 'heightMm'
  | 'radiatorThicknessMm'
  | 'class'
  | 'ramType'
  | 'capacityGb'
>

/** Thrown when a document lacks a field the price or the rules need (a data error in the panel). */
export class CatalogError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CatalogError'
  }
}

function need<T>(value: T | null | undefined, code: string, field: string): T {
  if (value === null || value === undefined) {
    throw new CatalogError(`${code}: brak pola „${field}” — uzupełnij w panelu.`)
  }
  return value
}

export function toCostLevel(doc: LevelDoc): CostLevel {
  const components = doc.components ?? []
  if (components.length === 0) {
    throw new CatalogError(`${doc.code}: poziom bez części — nie da się policzyć ceny.`)
  }
  return {
    code: doc.code,
    ramType: doc.ramType,
    gpuLengthMm: doc.gpuLengthMm,
    requiresAio: doc.requiresAio ?? false,
    minRamGb: doc.minRamGb,
    minSsdGb: doc.minSsdGb,
    minCoolerClass: doc.minCoolerClass,
    minCaseClass: doc.minCaseClass,
    color: doc.color,
    markupClass: doc.markupClass,
    markupOverride: doc.markupOverride ?? null,
    partsCost: components.reduce((sum, c) => sum + c.cost, 0),
  }
}

export function toCostOption(doc: OptionDoc): CostOption {
  const base = { code: doc.code, cost: doc.cost, active: doc.active ?? true }
  switch (doc.type) {
    case 'case':
      return {
        ...base,
        type: 'case',
        gpuMaxMm: need(doc.gpuMaxMm, doc.code, 'gpuMaxMm'),
        coolerMaxMm: need(doc.coolerMaxMm, doc.code, 'coolerMaxMm'),
        aio360: need(doc.aio360, doc.code, 'aio360'),
        class: need(doc.class, doc.code, 'class'),
      }
    case 'cooler': {
      const kind = need(doc.kind, doc.code, 'kind')
      return {
        ...base,
        type: 'cooler',
        kind,
        heightMm: kind === 'air' ? need(doc.heightMm, doc.code, 'heightMm') : null,
        radiatorThicknessMm:
          kind === 'aio360' ? need(doc.radiatorThicknessMm, doc.code, 'radiatorThicknessMm') : null,
        class: need(doc.class, doc.code, 'class'),
      }
    }
    case 'ram':
      return {
        ...base,
        type: 'ram',
        ramType: need(doc.ramType, doc.code, 'ramType'),
        capacityGb: need(doc.capacityGb, doc.code, 'capacityGb'),
      }
    case 'ssd':
      return { ...base, type: 'ssd', capacityGb: need(doc.capacityGb, doc.code, 'capacityGb') }
  }
}

export function toCatalog(
  levels: readonly LevelDoc[],
  options: readonly OptionDoc[],
  settings: PricingSettingsInput,
): Catalog {
  return {
    levels: levels.map(toCostLevel),
    options: options.map(toCostOption),
    settings,
  }
}
