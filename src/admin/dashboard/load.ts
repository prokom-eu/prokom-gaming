import 'server-only'

import type { Payload } from 'payload'

import { DEFAULT_REPLY_HOURS, type ReplyHours } from '../../lib/inquiry/sla'
import { topicOf } from '../../lib/inquiry/thread.server'
import type { InquiryStatus } from '../../lib/inquiry/types'
import { errorFields, log } from '../../lib/logger'
import { ORDER_STAGES, isOrderStage, type OrderStage } from '../../lib/orders'
import { buildQueue } from '../../lib/pricing/publish'
import { loadBatch, loadOffer } from '../../lib/pricing/store'
import { initials, whenLabel } from '../inquiries/format'
import { priceKey } from '../shell/load'
import { recentEvents, type DashEvent } from './events'
import { marginsView, type MarginsView } from './margins'
import { shortName, todoList, type DueOrder, type TodoItem } from './rules'
import { countByDay, lastDays } from './series'
import { latestReport } from '../price-reports/load'
import { marketChanges, type MarketRow } from '../price-reports/market'

/**
 * Everything the Pulpit shows, read once per request (panel spec §2a pt 10, P2: one loader, one
 * margin review per entry — not per tile). Admin only: the view calls `panelAccess` first.
 * Costs never leave this module — `MarginsView` holds prices and margins only.
 */

export type RecentInquiry = {
  number: string
  name: string
  initials: string
  topic: string
  when: string
  status: InquiryStatus
}

/** Stages on the workshop strip: the 7 columns of the board (spec §7), without „U klienta”. */
export const WORKSHOP_STAGES = ORDER_STAGES.filter((s) => s !== 'delivered')

export type WorkshopData = {
  /** Orders being built (not shipped yet) — „5 komputerów w realizacji”. */
  inProgress: number
  byStage: { stage: OrderStage; count: number }[]
}

export type PricesData =
  | { ok: true; batchDate: string; batchShort: string; view: MarginsView }
  | { ok: false; reason: 'no-batch' | 'error' }

export type DashboardData = {
  inquiries: {
    today: number
    yesterday: number
    waiting: number
    /** New inquiries per day, 30 days, oldest first. */
    series: number[]
  }
  recent: RecentInquiry[]
  todo: TodoItem[]
  workshop: WorkshopData
  prices: PricesData
  events: DashEvent[]
  /** P7: the newest price report — „Ceny na rynku”. */
  market: { id: number; date: string; rows: MarketRow[] } | null
}

const DAY_MS = 86_400_000
const trusted = { overrideAccess: true, depth: 0, pagination: false } as const

const dateLong = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const dateShort = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
})

/** The Pulpit of the workshop role (P2 decision): the workshop only. */
async function loadWorkshop(payload: Payload): Promise<WorkshopData> {
  const orders = await payload.find({
    collection: 'orders',
    where: { stage: { not_equals: 'delivered' } },
    select: { stage: true },
    ...trusted,
  })
  const byStage = WORKSHOP_STAGES.map((stage) => ({
    stage,
    count: orders.docs.filter((o) => o.stage === stage).length,
  }))
  return {
    inProgress: byStage.filter((s) => s.stage !== 'shipped').reduce((n, s) => n + s.count, 0),
    byStage,
  }
}

export async function loadDashboard(payload: Payload, now: Date): Promise<DashboardData> {
  const days = lastDays(now)
  const since = new Date(`${days[0]}T00:00:00Z`).getTime() - DAY_MS // a margin for the time zone

  const [mail, monthly, waiting, recent, dueOrders, workshop, prices, events, report] =
    await Promise.all([
      payload.findGlobal({ slug: 'mail-settings', depth: 0, overrideAccess: true }),
      payload.find({
        collection: 'inquiries',
        where: { createdAt: { greater_than_equal: new Date(since).toISOString() } },
        select: { createdAt: true },
        ...trusted,
      }),
      payload.find({
        collection: 'inquiries',
        where: { status: { equals: 'new' } },
        select: { name: true, createdAt: true },
        sort: 'createdAt',
        ...trusted,
      }),
      payload.find({
        collection: 'inquiries',
        sort: '-createdAt',
        limit: 4,
        depth: 1,
        populate: { builds: { name: true } },
        select: {
          number: true,
          name: true,
          status: true,
          createdAt: true,
          type: true,
          build: true,
          budget: true,
          voucher: true,
        },
        overrideAccess: true,
      }),
      payload.find({
        collection: 'orders',
        where: {
          and: [{ stage: { not_in: ['shipped', 'delivered'] } }, { dueDate: { exists: true } }],
        },
        select: { number: true, stage: true, dueDate: true, checklist: true, build: true },
        populate: { builds: { name: true } },
        overrideAccess: true,
        depth: 1,
        pagination: false,
      }),
      loadWorkshop(payload),
      loadPrices(payload),
      loadEvents(payload),
      latestReport(payload),
    ])

  const replyHours: ReplyHours = mail.replyHours ?? DEFAULT_REPLY_HOURS
  const slaMinutes = mail.replySlaMinutes ?? 60
  const series = countByDay(
    monthly.docs.map((d) => d.createdAt),
    days,
  )
  const view = prices.ok ? prices.view : null

  const orders: DueOrder[] = dueOrders.docs.flatMap((o) =>
    o.dueDate && isOrderStage(o.stage)
      ? [
          {
            id: o.id,
            number: o.number ?? `#${o.id}`,
            buildName: typeof o.build === 'object' && o.build ? o.build.name : null,
            stage: o.stage,
            dueDate: o.dueDate,
            checklistDone: (o.checklist ?? []).filter((c) => c.done).length,
            checklistTotal: (o.checklist ?? []).length,
          },
        ]
      : [],
  )

  return {
    market: report
      ? {
          id: report.id,
          date: dateLong.format(new Date(report.startedAt)),
          rows: marketChanges(report.diff),
        }
      : null,
    inquiries: {
      today: series.at(-1) ?? 0,
      yesterday: series.at(-2) ?? 0,
      waiting: waiting.docs.length,
      series,
    },
    recent: recent.docs.map((d) => ({
      number: d.number ?? `#${d.id}`,
      name: shortName(d.name),
      initials: initials(d.name),
      topic: topicOf(d),
      when: whenLabel(d.createdAt, now),
      status: d.status,
    })),
    todo: todoList(
      {
        waiting: waiting.docs,
        replyHours,
        slaMinutes,
        queue: view
          ? {
              count: view.queueCount,
              lowestNow: view.lowest.today ?? null,
              lowestAfter: view.lowest.after ?? null,
              minMargin: view.minMargin,
            }
          : null,
        orders,
        report: report
          ? {
              id: report.id,
              unread: !report.readAt,
              unavailable: report.diff.items
                .filter((i) => i.decision.kind === 'unavailable' && i.builds.length > 0)
                .map((i) => ({ title: i.title, builds: i.builds })),
            }
          : null,
      },
      now,
    ),
    workshop,
    prices,
    events,
  }
}

// --- Prices: one review per change of the inputs (same key as the shell + the builds) ---

let remembered: { key: string; value: PricesData } | null = null

async function loadPrices(payload: Payload): Promise<PricesData> {
  try {
    const builds = await payload
      .find({ collection: 'builds', sort: '-updatedAt', limit: 1, depth: 0, overrideAccess: true })
      .then((r) => `${r.totalDocs}@${r.docs[0]?.updatedAt ?? ''}`)
    const key = `${await priceKey(payload)}|${builds}`
    if (remembered?.key === key) return remembered.value
    const value = await computePrices(payload)
    remembered = { key, value }
    return value
  } catch (error) {
    log.error({ ...errorFields(error) }, 'pulpit: prices failed')
    return { ok: false, reason: 'error' }
  }
}

async function computePrices(payload: Payload): Promise<PricesData> {
  const current = await loadBatch(payload)
  if (!current) return { ok: false, reason: 'no-batch' }
  const { snapshot } = current
  const [offer, rows, levels, builds, settings] = await Promise.all([
    loadOffer(payload),
    payload.find({
      collection: 'published-prices',
      where: { batch: { equals: snapshot.batch } },
      select: { itemType: true, itemCode: true, costAtPublish: true },
      ...trusted,
    }),
    payload.find({
      collection: 'power-levels',
      select: { code: true, tierRoman: true },
      ...trusted,
    }),
    payload.find({
      collection: 'builds',
      select: { slug: true, creature: { key: true } },
      ...trusted,
    }),
    payload.findGlobal({ slug: 'pricing-settings', depth: 0, overrideAccess: true }),
  ])
  const tier = new Map(levels.docs.map((l) => [l.code, l.tierRoman]))
  const sigil = new Map(builds.docs.map((b) => [b.slug, b.creature?.key ?? b.slug]))
  const queue = buildQueue(offer.catalog, snapshot)
  const view = marginsView(
    offer.builds.map((b) => ({
      ...b,
      sigil: sigil.get(b.slug) ?? b.slug,
      tier: `Moc ${tier.get(b.config.level) ?? ''}`.trim(),
    })),
    offer.catalog,
    queue,
    rows.docs.map((r) => ({
      itemType: r.itemType,
      itemCode: r.itemCode,
      costAtPublish: r.costAtPublish ?? null,
    })),
    settings.warnMargin ?? 0.12,
  )
  const at = new Date(snapshot.publishedAt)
  return { ok: true, batchDate: dateLong.format(at), batchShort: dateShort.format(at), view }
}

// --- Events ---

async function loadEvents(payload: Payload): Promise<DashEvent[]> {
  const take = 5
  try {
    const [inquiries, replies, alarms, batches, orders] = await Promise.all([
      payload.find({
        collection: 'inquiries',
        sort: '-createdAt',
        limit: take,
        depth: 1,
        populate: { builds: { name: true } },
        select: {
          name: true,
          createdAt: true,
          type: true,
          build: true,
          budget: true,
          voucher: true,
        },
        overrideAccess: true,
      }),
      payload.find({
        collection: 'inquiry-messages',
        where: { direction: { equals: 'in' } },
        sort: '-at',
        limit: take,
        depth: 1,
        populate: { inquiries: { number: true } },
        select: { at: true, inquiry: true },
        overrideAccess: true,
      }),
      payload.find({
        collection: 'inquiries',
        where: { slaAlertedAt: { exists: true } },
        sort: '-slaAlertedAt',
        limit: take,
        depth: 0,
        select: { number: true, slaAlertedAt: true },
        overrideAccess: true,
      }),
      // One service row per batch: its number, date and author without reading 90 rows.
      payload.find({
        collection: 'published-prices',
        where: { itemType: { equals: 'service' } },
        sort: '-batch',
        limit: take,
        depth: 1,
        populate: { users: { email: true } },
        select: { batch: true, publishedAt: true, publishedBy: true },
        overrideAccess: true,
      }),
      payload.find({
        collection: 'orders',
        where: { stageChangedAt: { exists: true } },
        sort: '-stageChangedAt',
        limit: take,
        depth: 1,
        populate: { builds: { name: true } },
        select: { number: true, stage: true, stageChangedAt: true, build: true },
        overrideAccess: true,
      }),
    ])

    return recentEvents({
      inquiries: inquiries.docs.map((d) => ({
        id: d.id,
        createdAt: d.createdAt,
        name: d.name,
        topic: topicOf(d),
      })),
      replies: replies.docs.flatMap((m) =>
        typeof m.inquiry === 'object' && m.inquiry?.number
          ? [{ id: m.id, at: m.at, number: m.inquiry.number }]
          : [],
      ),
      slaAlarms: alarms.docs.flatMap((d) =>
        d.slaAlertedAt && d.number
          ? [{ id: d.id, slaAlertedAt: d.slaAlertedAt, number: d.number }]
          : [],
      ),
      batches: batches.docs.map((b) => ({
        batch: b.batch,
        publishedAt: b.publishedAt,
        by:
          typeof b.publishedBy === 'object' && b.publishedBy
            ? b.publishedBy.email.split('@')[0] || null
            : null,
      })),
      stages: orders.docs.flatMap((o) =>
        o.stageChangedAt && isOrderStage(o.stage)
          ? [
              {
                id: o.id,
                at: o.stageChangedAt,
                number: o.number ?? `#${o.id}`,
                buildName: typeof o.build === 'object' && o.build ? o.build.name : null,
                stage: o.stage,
              },
            ]
          : [],
      ),
    })
  } catch (error) {
    // Events are a side note: an error here must not take the Pulpit down.
    log.error({ ...errorFields(error) }, 'pulpit: events failed')
    return []
  }
}
