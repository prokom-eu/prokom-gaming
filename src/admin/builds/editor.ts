import 'server-only'

import type { Payload } from 'payload'

import type { ConfBuild, ConfOffer } from '../../lib/configurator'
import { compatLevel, compatOption } from '../../lib/inquiry/pricingStore'
import { buildQueue, pricesAfterQueue } from '../../lib/pricing/publish'
import {
  priceFromSnapshot,
  snapshotFromRows,
  type PriceList,
  type PublishedPriceRow,
} from '../../lib/pricing/snapshot'
import type { Config, OptionType } from '../../lib/pricing/types'
import { levelLine, type BuildsContext, type OfferStatus } from './load'

export type EditorOption = {
  code: string
  type: OptionType
  label: string
  photo: { src: string; alt: string } | null
}

export type EditorLevel = { code: string; title: string; detail: string }

export type PriceHistoryRow = { label: string; date: string | null; price: number | null }

/** Everything the build editor needs (panel only: costs). */
export type EditorData = {
  build: {
    slug: string
    name: string
    sigil: string
    status: OfferStatus
    config: Config
    tier: string
    updatedAt: string
    editHref: string
    texts: { epithet: string; short: string; why: string }
    photos: { src: string; alt: string }[]
  }
  levels: EditorLevel[]
  options: EditorOption[]
  offer: ConfOffer
  builds: ConfBuild[]
  prices: PriceList
  costsToday: PriceList
  costsAtBatch: PriceList
  minMargin: number
  warnMargin: number
  history: PriceHistoryRow[]
}

const dateShort = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

type MediaRef = { url?: string | null; alt?: string | null } | number | null | undefined
const photoOf = (m: MediaRef, alt: string) =>
  m && typeof m === 'object' && m.url ? { src: m.url, alt: m.alt || alt } : null

/** `null` = no such build (the editor answers like a missing page). */
export async function loadEditor(
  payload: Payload,
  ctx: BuildsContext,
  slug: string,
): Promise<EditorData | null> {
  const recipe = ctx.offer.builds.find((b) => b.slug === slug)
  if (!recipe) return null
  const admin = payload.config.routes.admin

  const [doc, options, newest] = await Promise.all([
    payload.findByID({
      collection: 'builds',
      id: recipe.id,
      select: {
        updatedAt: true,
        creature: { epithet: true, short: true, why: true },
        photos: true,
      },
      populate: { media: { url: true, filename: true, alt: true } },
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'options',
      select: { code: true, type: true, publicLabel: true, image: true },
      // Seed order = board order (like the configurator).
      sort: 'id',
      populate: { media: { url: true, filename: true, alt: true } },
      depth: 1,
      overrideAccess: true,
      pagination: false,
    }),
    payload.find({
      collection: 'published-prices',
      where: { batch: { greater_than: ctx.snapshot.batch - 5 } },
      select: { batch: true, itemType: true, itemCode: true, sellPrice: true, publishedAt: true },
      sort: '-batch',
      depth: 0,
      overrideAccess: true,
      pagination: false,
    }),
  ])

  const level = ctx.levels.find((l) => l.code === recipe.config.level)
  const catalog = ctx.offer.catalog

  // Price history of the build = the sum of its items in each of the last batches (spec §9),
  // newest first, with the price after approving the current queue on top when it differs.
  const byBatch = new Map<number, PublishedPriceRow[]>()
  for (const row of newest.docs) {
    const rows = byBatch.get(row.batch) ?? []
    rows.push(row as PublishedPriceRow)
    byBatch.set(row.batch, rows)
  }
  const history: PriceHistoryRow[] = [...byBatch.entries()]
    .sort(([a], [b]) => b - a)
    .map(([batch, rows]) => {
      const snapshot = snapshotFromRows(rows)
      return {
        label: `Partia #${batch}`,
        date: dateShort.format(new Date(snapshot.publishedAt)),
        price: priceFromSnapshot(recipe.config, snapshot),
      }
    })
  const pending = priceFromSnapshot(
    recipe.config,
    pricesAfterQueue(buildQueue(catalog, ctx.snapshot)),
  )
  if (pending !== null && pending !== history[0]?.price) {
    // TODO(krystian): label not on the board („oczekująca propozycja”, spec §9).
    history.unshift({ label: 'Po zatwierdzeniu kolejki', date: null, price: pending })
  }

  return {
    build: {
      slug: recipe.slug,
      name: recipe.name,
      sigil: ctx.creatures.get(recipe.slug) ?? recipe.slug,
      status: recipe.offerStatus,
      config: recipe.config,
      tier: level ? `Moc ${level.tierRoman}, ${level.tierLabel}` : recipe.config.level,
      updatedAt: dateShort.format(new Date(doc.updatedAt)),
      editHref: `${admin}/collections/builds/${recipe.id}`,
      texts: {
        epithet: doc.creature?.epithet ?? '',
        short: doc.creature?.short ?? '',
        why: doc.creature?.why ?? '',
      },
      photos: (doc.photos ?? []).flatMap((p) => {
        const photo = photoOf(p as MediaRef, recipe.name)
        return photo ? [photo] : []
      }),
    },
    levels: catalog.levels.map((l) => {
      const doc = ctx.levels.find((d) => d.code === l.code)
      const head = doc ? levelLine(l.code, doc.publicLabel) : l.code
      const classes = doc?.publicLabel.split(',')[0]?.trim() ?? ''
      return {
        code: l.code,
        // „P10 · Moc VI 2K wysokie (Radeon) · Ryzen 7 7800X3D + RX 9070 XT 16 GB” (board Zestaw).
        title: doc
          ? `${l.code} · Moc ${doc.tierRoman} ${doc.tierLabel}${doc.variant ? ` (${doc.variant})` : ''} · ${classes}`
          : head,
        detail: `${classes} · ${l.ramType} · karta ${l.gpuLengthMm} mm · min. ${l.minRamGb} GB RAM, ${l.minSsdGb} GB dysku`,
      }
    }),
    options: options.docs.map((o) => ({
      code: o.code,
      type: o.type,
      label: o.publicLabel,
      photo: photoOf(o.image as MediaRef, o.publicLabel),
    })),
    offer: {
      levels: catalog.levels.map(compatLevel),
      options: catalog.options.map(compatOption),
    },
    builds: ctx.offer.builds.map(({ slug, name, config }) => ({ slug, name, config })),
    prices: {
      level: ctx.snapshot.level,
      option: ctx.snapshot.option,
      service: ctx.snapshot.service,
    },
    costsToday: ctx.costsToday,
    costsAtBatch: ctx.costsAtBatch,
    minMargin: catalog.settings.minMargin,
    warnMargin: ctx.warnMargin,
    history,
  }
}
