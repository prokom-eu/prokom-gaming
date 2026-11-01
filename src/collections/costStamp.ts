import type { CollectionBeforeChangeHook } from 'payload'

import { partKey } from '../lib/pricing/partKey'

/** Cost source of an option or a power-level part (ADR-G007 §1). */
export const COST_SOURCES = [
  { label: 'Sklepy (najniższa cena dostępnej oferty)', value: 'market' },
  { label: 'Faktura (wpisany ręcznie)', value: 'invoice' },
] as const

export const COST_LABEL = 'Koszt zakupu brutto (zł)'

type CostFields = { cost?: number | null; costUpdatedAt?: string | null }
type Part = CostFields & {
  id?: string | null
  role?: string | null
  internalModel?: string | null
  partKey?: string | null
}

/** `costUpdatedAt` of an option moves only when its cost changes (create counts as a change). */
export const stampOptionCost: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const previous = (originalDoc as CostFields | undefined)?.cost
  if (data.cost !== undefined && data.cost !== previous)
    data.costUpdatedAt = new Date().toISOString()
  return data
}

/**
 * Parts of a power level: `costUpdatedAt` moves for parts whose cost changed (matched by array row
 * id, new rows count as changed) and an empty `partKey` is derived from role and model.
 */
export const stampPartCosts: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!Array.isArray(data.components)) return data
  const before = new Map<string, Part>()
  for (const part of (originalDoc as { components?: Part[] } | undefined)?.components ?? []) {
    if (part.id) before.set(part.id, part)
  }
  const now = new Date().toISOString()
  data.components = (data.components as Part[]).map((part) => {
    const next = { ...part }
    const old = part.id ? before.get(part.id) : undefined
    if (!old || old.cost !== part.cost) next.costUpdatedAt = now
    // A replaced model gets a new key, unless the key was edited by hand in the same save.
    const modelReplaced =
      old !== undefined && old.internalModel !== part.internalModel && old.partKey === part.partKey
    if ((!next.partKey || modelReplaced) && part.role && part.internalModel) {
      next.partKey = partKey(part.role, part.internalModel)
    }
    return next
  })
  return data
}
