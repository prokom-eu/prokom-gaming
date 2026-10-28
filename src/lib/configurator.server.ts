import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import {
  compactFps,
  CONFIGURATOR_GAMES,
  type CompactFps,
  type ConfBuild,
  type ConfOption,
} from './configurator'
import { loadFpsTable } from './fps.server'
import type { GameScale, Resolution } from './fps'
import { loadInquiryOffer } from './inquiry/pricingStore'
import type { PriceSnapshot } from './pricing/snapshot'
import { loadBatch } from './pricing/store'
import type { CompatLevel } from './pricing/types'

/** A power level as the configurator shows it: rules + public labels of its parts. */
export type ConfiguratorLevel = CompatLevel & {
  tier: number
  /** Realm of the tier, e.g. „4K”, „FullHD start”. */
  tierLabel: string
  /** „GeForce”, „Radeon”, „biały GeForce”… or '' for a tier with one level. */
  variant: string
  resolution: Resolution
  /** The level's own build: name, sigil, FPS and the nearest ready build. */
  build: string
  cpu: string
  gpu: string
  mobo: string
  psu: string
}

export type ConfiguratorOption = ConfOption & {
  label: string
  description: string | null
  color: string | null
  photo: { src: string; alt: string } | null
}

export type ConfiguratorBuild = ConfBuild & { key: string }

export type ConfiguratorGame = GameScale & { slug: string; name: string }

export type ConfiguratorData = {
  levels: ConfiguratorLevel[]
  /** Active options only (the configurator never offers an inactive one). */
  options: ConfiguratorOption[]
  builds: ConfiguratorBuild[]
  /** Newest published batch; `null` before the first publication. */
  prices: Pick<PriceSnapshot, 'level' | 'option' | 'service' | 'levelFrom'> | null
  games: ConfiguratorGame[]
  fps: CompactFps
}

const idOf = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value && typeof value.id === 'number'
      ? value.id
      : null

/**
 * Everything the configurator needs, once per request. The rules and recipes come from
 * `loadInquiryOffer()` — the same mapping `/api/inquiry` checks against — so the configurator
 * offers exactly what the inquiry accepts. Labels, photos and tiers are read as the visitor with an
 * explicit `select`; the level's parts are read trusted and only `role` + `publicLabel` are copied
 * (ADR-G002 §8.7, same pattern as `offer.server.ts`). Prices from one batch (`loadBatch()`).
 */
export async function loadConfigurator(): Promise<ConfiguratorData> {
  const payload = await getPayload({ config })
  const asVisitor = { overrideAccess: false, depth: 0, pagination: false } as const

  const [catalog, batch, levels, parts, options, builds, fps] = await Promise.all([
    loadInquiryOffer(payload),
    loadBatch(payload),
    payload.find({
      collection: 'power-levels',
      select: {
        code: true,
        tier: true,
        tierLabel: true,
        variant: true,
        targetResolution: true,
        leadBuild: true,
      },
      sort: 'code',
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
      collection: 'options',
      select: { code: true, publicLabel: true, description: true, color: true, image: true },
      // Seed order = board order (the configurator lists options in it).
      sort: 'id',
      // `url` is computed from `filename`, so both are selected.
      populate: { media: { url: true, filename: true, alt: true } },
      overrideAccess: false,
      depth: 1,
      pagination: false,
    }),
    payload.find({
      collection: 'builds',
      select: { slug: true, creature: { key: true } },
      ...asVisitor,
    }),
    loadFpsTable(),
  ])

  const buildSlug = new Map(builds.docs.map((b) => [b.id, b.slug]))
  const buildKey = new Map(builds.docs.map((b) => [b.slug, b.creature.key]))
  const compat = new Map(catalog.offer.levels.map((l) => [l.code, l]))
  const labels = new Map(
    parts.docs.map((l) => {
      const label = (role: string) => l.components?.find((c) => c.role === role)?.publicLabel ?? ''
      return [
        l.code,
        { cpu: label('cpu'), gpu: label('gpu'), mobo: label('mobo'), psu: label('psu') },
      ]
    }),
  )

  const levelList: ConfiguratorLevel[] = levels.docs.flatMap((l) => {
    const rules = compat.get(l.code)
    const lead = idOf(l.leadBuild)
    const build = lead === null ? undefined : buildSlug.get(lead)
    // A level without its build has no FPS and no ready build to compare: not offered.
    if (!rules || !build) return []
    return [
      {
        ...rules,
        tier: l.tier,
        tierLabel: l.tierLabel,
        variant: l.variant ?? '',
        resolution: l.targetResolution,
        build,
        ...(labels.get(l.code) ?? { cpu: '', gpu: '', mobo: '', psu: '' }),
      },
    ]
  })

  const rules = new Map(catalog.offer.options.map((o) => [o.code, o]))
  const optionList: ConfiguratorOption[] = options.docs.flatMap((doc) => {
    const o = rules.get(doc.code)
    // Visitors read active options only; an inactive one is never offered.
    if (!o || !o.active) return []
    const image = doc.image && typeof doc.image === 'object' ? doc.image : null
    return [
      {
        ...o,
        label: doc.publicLabel,
        description: doc.description ?? null,
        color: doc.color ?? null,
        photo: image?.url ? { src: image.url, alt: image.alt } : null,
      },
    ]
  })

  const buildList: ConfiguratorBuild[] = catalog.offer.builds.flatMap((b) => {
    const key = buildKey.get(b.slug)
    return key ? [{ slug: b.slug, name: b.name, config: b.config, key }] : []
  })

  const games: ConfiguratorGame[] = CONFIGURATOR_GAMES.flatMap((slug) => {
    const g = fps.games.find((x) => x.slug === slug)
    return g ? [{ slug: g.slug, name: g.name, kind: g.kind, fpsCap: g.fpsCap }] : []
  })

  const snapshot = batch?.snapshot ?? null
  return {
    levels: levelList,
    options: optionList,
    builds: buildList,
    prices: snapshot
      ? {
          level: snapshot.level,
          option: snapshot.option,
          service: snapshot.service,
          levelFrom: snapshot.levelFrom,
        }
      : null,
    games,
    fps: compactFps(
      fps.table,
      games.map((g) => g.slug),
    ),
  }
}
