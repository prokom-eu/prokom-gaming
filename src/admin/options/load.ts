import 'server-only'

import type { Payload } from 'payload'

import { lookupPrice } from '../../lib/pricing/snapshot'
import { loadBatch } from '../../lib/pricing/store'
import type { OptionType } from '../../lib/pricing/types'

export type OptionsTab = OptionType | 'level'

/** One row of „Opcje konfiguratora” (panel spec §10, board Opcje). Panel only: costs, models. */
export type OptionRow = {
  id: number
  code: string
  tab: OptionsTab
  label: string
  internalModel: string | null
  photo: string | null
  /** Compatibility parameters in two lines, like the board. */
  params: string
  paramsNote: string | null
  cost: number | null
  /** Price on the site; `null` = never published (new). */
  price: number | null
  builds: string[]
  /** Active offer links; for a level: parts with at least one link, of all parts. */
  sources: { count: number; of?: number }
  /** `null` for power levels (they have no switch, spec §10). */
  active: boolean | null
  editPath: string
}

const AIO: Record<string, string> = {
  none: 'brak',
  front: 'przód',
  top_only: 'tylko góra',
  side: 'bok',
  yes: 'tak',
}

const trusted = { overrideAccess: true, depth: 0, pagination: false } as const

type MediaRef = { url?: string | null } | number | null | undefined
const urlOf = (m: MediaRef) => (m && typeof m === 'object' && m.url ? m.url : null)

/** Everything the options screen shows, read once. */
export async function loadOptions(payload: Payload): Promise<OptionRow[]> {
  const [options, levels, builds, sources, batch] = await Promise.all([
    payload.find({
      collection: 'options',
      // Seed order = board order.
      sort: 'id',
      populate: { media: { url: true, filename: true } },
      ...trusted,
      depth: 1,
    }),
    payload.find({ collection: 'power-levels', sort: 'code', ...trusted }),
    payload.find({
      collection: 'builds',
      select: { name: true, level: true, case: true, cooler: true, ram: true, ssd: true },
      sort: 'name',
      ...trusted,
    }),
    payload.find({
      collection: 'price-sources',
      where: { active: { equals: true } },
      select: { itemType: true, itemCode: true },
      ...trusted,
    }),
    loadBatch(payload),
  ])

  const admin = payload.config.routes.admin
  const idOf = (ref: number | { id: number }) => (typeof ref === 'number' ? ref : ref.id)
  const usedBy = (slot: 'level' | OptionType, id: number) =>
    builds.docs.filter((b) => idOf(b[slot]) === id).map((b) => b.name)
  const linkCount = (type: 'option' | 'component', code: string | null | undefined) =>
    code ? sources.docs.filter((s) => s.itemType === type && s.itemCode === code).length : 0
  const snapshot = batch?.snapshot

  const rows: OptionRow[] = options.docs.map((o) => {
    let params = ''
    let paramsNote: string | null = null
    const look = [o.class ? `klasa ${o.class}` : null, o.color].filter(Boolean).join(' · ')
    switch (o.type) {
      case 'case':
        params = `karta do ${o.gpuMaxMm} mm · chłodzenie do ${o.coolerMaxMm} mm · AIO 360: ${AIO[o.aio360 ?? 'none'] ?? o.aio360}`
        paramsNote = look || null
        break
      case 'cooler':
        params =
          o.kind === 'aio360'
            ? `AIO 360 · chłodnica ${o.radiatorThicknessMm} mm`
            : `powietrzne · wysokość ${o.heightMm} mm`
        paramsNote = look || null
        break
      case 'ram':
        params = `${o.ramType} · ${o.capacityGb} GB`
        break
      case 'ssd':
        params = `${o.capacityGb} GB`
        break
    }
    return {
      id: o.id,
      code: o.code,
      tab: o.type,
      label: o.publicLabel,
      internalModel: o.internalModel ?? null,
      photo: urlOf(o.image as MediaRef),
      params,
      paramsNote,
      cost: o.cost ?? null,
      price: snapshot ? (lookupPrice(snapshot.option, o.code) ?? null) : null,
      builds: usedBy(o.type, o.id),
      sources: { count: linkCount('option', o.code) },
      active: o.active ?? true,
      editPath: `${admin}/collections/options/${o.id}`,
    }
  })

  for (const l of levels.docs) {
    const parts = l.components ?? []
    rows.push({
      id: l.id,
      code: l.code,
      tab: 'level',
      label: `${l.code} · Moc ${l.tierRoman} ${l.tierLabel}${l.variant ? ` (${l.variant})` : ''}`,
      internalModel: parts.map((p) => p.internalModel).join(', ') || null,
      photo: null,
      params: `${l.platform} · ${l.ramType} · karta ${l.gpuLengthMm} mm`,
      paramsNote: `min. ${l.minRamGb} GB RAM, ${l.minSsdGb} GB dysku · obudowa kl. ${l.minCaseClass} · chłodzenie kl. ${l.minCoolerClass}${l.requiresAio ? ' · AIO 360' : ''}`,
      cost: parts.reduce((sum, p) => sum + p.cost, 0),
      price: snapshot ? (lookupPrice(snapshot.level, l.code) ?? null) : null,
      builds: usedBy('level', l.id),
      sources: {
        count: parts.filter((p) => linkCount('component', p.partKey) > 0).length,
        of: parts.length,
      },
      active: null,
      editPath: `${admin}/collections/power-levels/${l.id}`,
    })
  }
  return rows
}
