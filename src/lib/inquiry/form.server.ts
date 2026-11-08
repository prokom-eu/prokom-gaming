import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { RESOLUTION_LABELS } from '../fps'
import { priceFromSnapshot } from '../pricing/snapshot'
import { loadBatch } from '../pricing/store'
import { FORM_GAMES, type FormBuild, type FormData, type FormLevel } from './form'
import { loadInquiryOffer } from './pricingStore'

const idOf = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value && typeof value.id === 'number'
      ? value.id
      : null

/**
 * What the inquiry form needs, once per request. Rules and recipes come from `loadInquiryOffer()`
 * — the mapping `/api/inquiry` checks against — so the price preview is the server's own. Names,
 * tiers and games are read as the visitor; of the level's parts only `role` + `publicLabel` of the
 * CPU and GPU are copied out (ADR-G002 §8.7, same pattern as `offer.server.ts`).
 */
export async function loadInquiryForm(): Promise<FormData> {
  const payload = await getPayload({ config })
  const asVisitor = { overrideAccess: false, depth: 0, pagination: false } as const

  const [offer, batch, builds, levels, parts, games] = await Promise.all([
    loadInquiryOffer(payload),
    loadBatch(payload),
    payload.find({
      collection: 'builds',
      select: { slug: true, name: true, level: true, creature: { key: true } },
      ...asVisitor,
    }),
    payload.find({
      collection: 'power-levels',
      select: { code: true, tier: true, tierRoman: true, targetResolution: true, leadBuild: true },
      ...asVisitor,
    }),
    payload.find({
      collection: 'power-levels',
      select: { code: true, components: { role: true, publicLabel: true } },
      overrideAccess: true,
      depth: 0,
      pagination: false,
    }),
    payload.find({
      collection: 'games',
      where: { slug: { in: [...FORM_GAMES] } },
      select: { slug: true, name: true },
      ...asVisitor,
    }),
  ])

  const buildSlug = new Map(builds.docs.map((b) => [b.id, b.slug]))
  const levelById = new Map(levels.docs.map((l) => [l.id, l]))
  const part = new Map(
    parts.docs.map((l) => {
      const label = (role: string) => l.components?.find((c) => c.role === role)?.publicLabel ?? ''
      return [l.code, { cpu: label('cpu'), gpu: label('gpu') }]
    }),
  )

  const formLevels: Record<string, FormLevel> = {}
  for (const l of levels.docs) {
    const lead = idOf(l.leadBuild)
    formLevels[l.code] = {
      power: `Moc ${l.tierRoman}`,
      realm: RESOLUTION_LABELS[l.targetResolution],
      build: (lead !== null && buildSlug.get(lead)) || '',
      ...(part.get(l.code) ?? { cpu: '', gpu: '' }),
    }
  }

  const formBuilds = builds.docs
    .flatMap((b) => {
      const levelId = idOf(b.level)
      const level = levelId === null ? undefined : levelById.get(levelId)
      if (!level) return []
      const build: FormBuild = {
        slug: b.slug,
        name: b.name,
        key: b.creature.key,
        power: `Moc ${level.tierRoman}`,
        realm: RESOLUTION_LABELS[level.targetResolution],
      }
      const recipe = offer.offer.builds.find((r) => r.slug === b.slug)?.config
      const price = recipe && batch ? (priceFromSnapshot(recipe, batch.snapshot) ?? 0) : 0
      return [{ build, tier: level.tier, price }]
    })
    // The board's grid: by tier, then by price within a tier.
    .sort((a, b) => a.tier - b.tier || a.price - b.price)
    .map((entry) => entry.build)

  const gameName = new Map(games.docs.map((g) => [g.slug, g.name]))
  return {
    offer: offer.offer,
    snapshot: batch?.snapshot ?? null,
    // Only the options' names: the levels are shown by tier and CPU/GPU class (`levels`).
    labels: { option: offer.labels.option },
    builds: formBuilds,
    levels: formLevels,
    games: FORM_GAMES.flatMap((slug) => {
      const name = gameName.get(slug)
      return name ? [{ slug, name }] : []
    }),
  }
}
