import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import {
  BUILD_PAGE_GAMES,
  interiorParts,
  monitorFit,
  neighbours,
  prevNext,
  tuneChoices,
  type InteriorPart,
  type MonitorFit,
  type TuneChoice,
} from './buildPage'
import type { FpsListGame, FpsTable } from './fps'
import type { HeroBuild } from './home'
import { loadInquiryOffer } from './inquiry/pricingStore'
import { loadOffer } from './offer.server'
import { priceFromSnapshot } from './pricing/snapshot'
import { loadBatch } from './pricing/store'
import type { Config } from './pricing/types'

export type BuildPageData = {
  build: HeroBuild & {
    genitive: string
    why: string
    giftTitle: string
    gift: string
    legend: string
    legendSource: { title: string; url: string }
  }
  config: Config
  /** Public labels of the parts in „Twoja wersja” and the sticky bar. */
  ramType: string
  interior: InteriorPart[]
  /** Air (tower) cooler instead of an AIO: the plan draws part 3 differently. */
  airCooler: boolean
  upgrade: {
    freeRamSlots: number | null
    freeM2Slots: string | null
    socket: string | null
    socketNote: string | null
    psuW: number | null
  } | null
  tune: { ram: TuneChoice[]; ssd: TuneChoice[] }
  monitor: MonitorFit[]
  fps: { games: FpsListGame[]; table: FpsTable }
  pricedAt: string | null
  neighbours: HeroBuild[]
  switcher: { position: number; total: number; prev: HeroBuild; next: HeroBuild } | null
  faq: { id: number; question: string; answer: string }[]
}

/**
 * One build page. The shared offer (`loadOffer()`: hero data of all 16, FPS) and the inquiry's own
 * offer (`loadInquiryOffer()`: compatibility data, recipes, labels) — so „Dopasuj” offers exactly
 * what `/api/inquiry` accepts. This build's price, the surcharges and the price date all come from
 * one newest batch (`loadBatch()`), read once. Without any published batch the page still stands,
 * only without a price and „Dopasuj” (review G9). The level's parts are read trusted and only
 * `role` + `publicLabel` are copied out (ADR-G002 §8.7). `null` = no such build.
 */
export async function loadBuildPage(slug: string): Promise<BuildPageData | null> {
  const payload = await getPayload({ config })
  const asVisitor = { overrideAccess: false, depth: 0, pagination: false } as const

  const found = await payload.find({
    collection: 'builds',
    where: { slug: { equals: slug } },
    select: {
      slug: true,
      level: true,
      creature: {
        genitive: true,
        why: true,
        giftTitle: true,
        gift: true,
        legend: true,
        legendSource: { title: true, url: true },
      },
    },
    limit: 1,
    overrideAccess: false,
    depth: 0,
  })
  const doc = found.docs[0]
  if (!doc) return null
  const levelId = typeof doc.level === 'number' ? doc.level : doc.level.id

  const [offer, catalog, batch, level, parts, faq] = await Promise.all([
    loadOffer(payload),
    loadInquiryOffer(payload),
    loadBatch(payload),
    payload.findByID({
      collection: 'power-levels',
      id: levelId,
      select: { code: true, platform: true, ramType: true, upgrade: true },
      ...asVisitor,
    }),
    payload.findByID({
      collection: 'power-levels',
      id: levelId,
      select: { components: { role: true, publicLabel: true } },
      overrideAccess: true,
      depth: 0,
    }),
    payload.find({
      collection: 'faq',
      where: { group: { equals: 'build' } },
      select: { question: true, answer: true },
      sort: 'order',
      ...asVisitor,
    }),
  ])

  const shown = offer.hero.builds.find((b) => b.slug === slug)
  const recipe = catalog.offer.builds.find((b) => b.slug === slug)
  if (!shown || !recipe) return null
  const snapshot = batch?.snapshot ?? null
  // The price from the same batch as the surcharges (not the hero's own read of the newest batch).
  const build = {
    ...shown,
    price: snapshot ? priceFromSnapshot(recipe.config, snapshot) : null,
  }
  const label = (role: string) => parts.components?.find((c) => c.role === role)?.publicLabel ?? ''
  const optionLabel = (code: string) => catalog.labels.option[code] ?? ''
  const cooler = catalog.offer.options.find((o) => o.code === recipe.config.cooler)

  const games: FpsListGame[] = BUILD_PAGE_GAMES.flatMap((s) => {
    const g = offer.fps.games.find((x) => x.slug === s)
    return g
      ? [
          {
            slug: g.slug,
            name: g.name,
            kind: g.kind,
            fpsCap: g.fpsCap,
            settingNote: g.settingNote,
          },
        ]
      : []
  })

  return {
    build: {
      ...build,
      genitive: doc.creature.genitive,
      why: doc.creature.why,
      giftTitle: doc.creature.giftTitle,
      gift: doc.creature.gift,
      legend: doc.creature.legend,
      legendSource: { title: doc.creature.legendSource.title, url: doc.creature.legendSource.url },
    },
    config: recipe.config,
    ramType: level.ramType,
    interior: interiorParts({
      cpu: label('cpu'),
      gpu: label('gpu'),
      motherboard: label('mobo'),
      psu: label('psu'),
      ram: optionLabel(recipe.config.ram),
      ssd: optionLabel(recipe.config.ssd),
      cooler: optionLabel(recipe.config.cooler),
      coolerKind: cooler?.type === 'cooler' ? cooler.kind : 'air',
      case: optionLabel(recipe.config.case),
      platform: level.platform,
      resolution: build.resolution,
    }),
    airCooler: cooler?.type !== 'cooler' || cooler.kind === 'air',
    upgrade: level.upgrade
      ? {
          freeRamSlots: level.upgrade.freeRamSlots ?? null,
          freeM2Slots: level.upgrade.freeM2Slots ?? null,
          socket: level.upgrade.socket ?? null,
          socketNote: level.upgrade.socketNote ?? null,
          psuW: level.upgrade.psuW ?? null,
        }
      : null,
    tune: snapshot
      ? {
          ram: tuneChoices('ram', recipe.config, catalog.offer, snapshot),
          ssd: tuneChoices('ssd', recipe.config, catalog.offer, snapshot),
        }
      : { ram: [], ssd: [] },
    monitor: monitorFit(offer.fps.table, slug),
    fps: { games, table: offer.fps.table },
    pricedAt: snapshot?.publishedAt ?? null,
    neighbours: neighbours(offer.hero.builds, slug),
    switcher: prevNext(offer.hero.builds, slug),
    faq: faq.docs.map((q) => ({ id: q.id, question: q.question, answer: q.answer })),
  }
}
