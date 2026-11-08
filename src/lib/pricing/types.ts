/**
 * Shapes shared by the pricing and compatibility layers (ADR-G002 §3, §5). Browser-safe: nothing
 * here carries a cost or an internal model — those live only in `cost.ts` (server-only).
 */

/** Format of an item code (`P07`, `SIG3A`) — the inquiry API and the configurator's address. */
export const ITEM_CODE = /^[A-Za-z0-9_-]{1,40}$/

/** Item code of the service (assembly, Windows, shipping) in published prices. */
export const SERVICE_CODE = 'SERVICE'

/** A configuration = item codes: power level + case + cooler + RAM + SSD (a build is one too). */
export type Config = {
  level: string
  case: string
  cooler: string
  ram: string
  ssd: string
}

export type OptionType = 'case' | 'cooler' | 'ram' | 'ssd'
export type RamType = 'DDR4' | 'DDR5'

/** What the compatibility and sense rules need to know about a power level. */
export type CompatLevel = {
  code: string
  ramType: RamType
  gpuLengthMm: number
  requiresAio: boolean
  minRamGb: number
  minSsdGb: number
  minCoolerClass: number
  minCaseClass: number
}

export type CompatCase = {
  type: 'case'
  code: string
  gpuMaxMm: number
  coolerMaxMm: number
  aio360: 'none' | 'front' | 'top_only' | 'side' | 'yes'
  class: number
}

export type CompatCooler = {
  type: 'cooler'
  code: string
  kind: 'air' | 'aio360'
  /** Air coolers only. */
  heightMm: number | null
  /** AIO 360 only. */
  radiatorThicknessMm: number | null
  class: number
}

export type CompatRam = { type: 'ram'; code: string; ramType: RamType; capacityGb: number }
export type CompatSsd = { type: 'ssd'; code: string; capacityGb: number }

export type CompatOption = CompatCase | CompatCooler | CompatRam | CompatSsd

/** The resolved parts of one configuration. */
export type CompatParts = {
  level: CompatLevel
  case: CompatCase
  cooler: CompatCooler
  ram: CompatRam
  ssd: CompatSsd
}
