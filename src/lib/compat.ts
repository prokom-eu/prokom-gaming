/**
 * Compatibility and sense rules (ADR-G002 §5) — the same code in the browser (configurator greys
 * out options with a reason) and on the server (`submitInquiry()` rejects a broken configuration
 * with 400). Works on public offer data only; no costs.
 */
import type {
  CompatCase,
  CompatCooler,
  CompatLevel,
  CompatOption,
  CompatParts,
  CompatRam,
  CompatSsd,
  Config,
} from './pricing/types'

/** Error codes in the order of the ADR table; `errors[]` keeps this order. */
export const COMPAT_ERRORS = [
  'gpu_too_long',
  'cooler_too_tall',
  'no_aio_mount',
  'ram_type',
  'requires_aio',
  'ram_too_small',
  'ssd_too_small',
  'cooler_class_too_low',
  'case_class_too_low',
] as const

export type CompatError = (typeof COMPAT_ERRORS)[number]
export type CompatWarning = 'thick_radiator_top_only'

export type CompatResult = {
  /** Every broken rule, in `COMPAT_ERRORS` order. Empty = the configuration may be ordered. */
  errors: CompatError[]
  /** Not blocking; shown next to the choice. */
  warnings: CompatWarning[]
}

/** An AIO radiator at least this thick is "thick" (clearance above the RAM in top-only cases). */
export const THICK_RADIATOR_MM = 38

/** Check one configuration against every rule. */
export function checkCompat(p: CompatParts): CompatResult {
  const failed: Record<CompatError, boolean> = {
    gpu_too_long: p.level.gpuLengthMm > p.case.gpuMaxMm,
    // Missing height on an air cooler fails the check: better greyed out than not fitting.
    cooler_too_tall:
      p.cooler.kind === 'air' &&
      !(p.cooler.heightMm !== null && p.cooler.heightMm <= p.case.coolerMaxMm),
    no_aio_mount: p.cooler.kind === 'aio360' && p.case.aio360 === 'none',
    ram_type: p.ram.ramType !== p.level.ramType,
    requires_aio: p.level.requiresAio && p.cooler.kind !== 'aio360',
    ram_too_small: p.ram.capacityGb < p.level.minRamGb,
    ssd_too_small: p.ssd.capacityGb < p.level.minSsdGb,
    cooler_class_too_low: p.cooler.class < p.level.minCoolerClass,
    case_class_too_low: p.case.class < p.level.minCaseClass,
  }
  const errors = COMPAT_ERRORS.filter((code) => failed[code])

  const warnings: CompatWarning[] = []
  if (
    p.cooler.kind === 'aio360' &&
    (p.cooler.radiatorThicknessMm ?? 0) >= THICK_RADIATOR_MM &&
    p.case.aio360 === 'top_only'
  ) {
    warnings.push('thick_radiator_top_only')
  }
  return { errors, warnings }
}

/** Message next to a greyed-out option or a warning (ADR-G002 §5, texts 1:1). */
export function compatMessage(code: CompatError | CompatWarning, level: CompatLevel): string {
  switch (code) {
    case 'gpu_too_long':
      return 'Karta tego poziomu się nie zmieści'
    case 'cooler_too_tall':
      return 'Chłodzenie za wysokie do tej obudowy'
    case 'no_aio_mount':
      return 'Brak miejsca na chłodnicę 360 mm'
    case 'ram_type':
      return `Ten poziom używa pamięci ${level.ramType}`
    case 'requires_aio':
      return 'Ten procesor wymaga chłodzenia wodnego 360 mm'
    case 'ram_too_small':
      return `Za mało pamięci do tego poziomu (min. ${level.minRamGb} GB)`
    case 'ssd_too_small':
      return 'Za mały dysk do tego poziomu'
    case 'cooler_class_too_low':
      return 'Za słabe chłodzenie do tego poziomu'
    case 'case_class_too_low':
      return 'Za prosta obudowa do tego poziomu'
    case 'thick_radiator_top_only':
      return 'Gruba chłodnica na górze — sprawdzimy prześwit nad pamięcią'
  }
}

// --- Resolving codes to parts ---

/** Offer data indexed by code. Generic: the cost layer passes parts that also carry costs. */
export type OfferIndex<L extends CompatLevel, O extends CompatOption> = {
  level: Map<string, L>
  case: Map<string, Extract<O, CompatCase>>
  cooler: Map<string, Extract<O, CompatCooler>>
  ram: Map<string, Extract<O, CompatRam>>
  ssd: Map<string, Extract<O, CompatSsd>>
}

export type PartsOf<L extends CompatLevel, O extends CompatOption> = {
  level: L
  case: Extract<O, CompatCase>
  cooler: Extract<O, CompatCooler>
  ram: Extract<O, CompatRam>
  ssd: Extract<O, CompatSsd>
}

export function indexOffer<L extends CompatLevel, O extends CompatOption>(
  levels: readonly L[],
  options: readonly O[],
): OfferIndex<L, O> {
  const index: OfferIndex<L, O> = {
    level: new Map(levels.map((l) => [l.code, l])),
    case: new Map(),
    cooler: new Map(),
    ram: new Map(),
    ssd: new Map(),
  }
  for (const o of options) {
    // The type guard is the `type` field itself; TypeScript cannot narrow a generic union here.
    ;(index[o.type] as Map<string, O>).set(o.code, o)
  }
  return index
}

/**
 * The parts of a configuration, or `null` when a code is unknown or names an option of another
 * type (e.g. a cooler code in the RAM slot).
 */
export function resolveParts<L extends CompatLevel, O extends CompatOption>(
  config: Config,
  index: OfferIndex<L, O>,
): PartsOf<L, O> | null {
  const level = index.level.get(config.level)
  const caseOpt = index.case.get(config.case)
  const cooler = index.cooler.get(config.cooler)
  const ram = index.ram.get(config.ram)
  const ssd = index.ssd.get(config.ssd)
  if (!level || !caseOpt || !cooler || !ram || !ssd) return null
  return { level, case: caseOpt, cooler, ram, ssd }
}
