import {
  checkCompat,
  indexOffer,
  resolveParts,
  type CompatError,
  type CompatWarning,
} from '../compat'
import { lookupPrice, priceFromSnapshot, type PriceSnapshot } from '../pricing/snapshot'
import type { CompatLevel, CompatOption, Config } from '../pricing/types'

/** What pricing an inquiry needs from the offer — no costs (the loader drops them). */
export type InquiryOffer = {
  levels: readonly CompatLevel[]
  options: readonly (CompatOption & { active: boolean })[]
  builds: readonly { id: number; slug: string; name: string; config: Config }[]
}

export type PricedComputer = {
  build: { id: number; slug: string; name: string } | null
  config: Config
  /** Sum of published prices of the newest batch — never a number from the browser. */
  price: number
  batch: number
  warnings: CompatWarning[]
}

export type PriceResult =
  ({ ok: true } & PricedComputer) | { ok: false; fields: string[]; compat?: CompatError[] }

const KEYS = ['level', 'case', 'cooler', 'ram', 'ssd'] as const satisfies readonly (keyof Config)[]

/**
 * The computer of an inquiry, priced and checked on the server (ADR-G005 flow 1, ADR-G002 §3, §5):
 * a build's recipe with the customer's changes, or a full configuration. Rejected — with the
 * fields to correct — when a build or code is unknown, an option is not on sale, a code has no
 * published price, or the parts do not fit together.
 */
export function priceComputer(
  request: { build?: string; config?: Partial<Config> },
  offer: InquiryOffer,
  snapshot: PriceSnapshot,
): PriceResult {
  let build: InquiryOffer['builds'][number] | null = null
  if (request.build !== undefined) {
    build = offer.builds.find((b) => b.slug === request.build) ?? null
    if (!build) return { ok: false, fields: ['build'] }
  }

  const changes = request.config ?? {}
  const merged: Partial<Config> = { ...build?.config }
  for (const key of KEYS) {
    if (changes[key] !== undefined) merged[key] = changes[key]
  }

  const index = indexOffer(offer.levels, offer.options)
  const bad: string[] = []
  for (const key of KEYS) {
    const value = merged[key]
    const part = value === undefined ? undefined : index[key].get(value)
    const onSale = part !== undefined && ('active' in part ? part.active : true)
    const list = key === 'level' ? snapshot.level : snapshot.option
    const priced = value !== undefined && lookupPrice(list, value) !== undefined
    if (!onSale || !priced) bad.push(`config.${key}`)
  }
  if (bad.length > 0) return { ok: false, fields: bad }

  const config = merged as Config
  // Every code resolved above; the check keeps TypeScript and a future refactor honest.
  const parts = resolveParts(config, index)
  if (!parts) return { ok: false, fields: ['config'] }
  const { errors, warnings } = checkCompat(parts)
  if (errors.length > 0) return { ok: false, fields: ['config'], compat: errors }

  const price = priceFromSnapshot(config, snapshot)
  if (price === null) return { ok: false, fields: ['config'] }

  return {
    ok: true,
    build: build ? { id: build.id, slug: build.slug, name: build.name } : null,
    config,
    price,
    batch: snapshot.batch,
    warnings,
  }
}
