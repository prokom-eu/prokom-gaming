import 'server-only'

import type { Payload } from 'payload'

import { getEnv, umamiConfig } from '../../lib/env'
import { traffic, type TrafficDetails, type TrafficSummary } from '../../lib/umami'
import { dayKey } from '../dashboard/rules'
import {
  biggestLoss,
  buildSlugOf,
  cumulative,
  deviceShares,
  entryLabel,
  fillDays,
  funnel,
  paidAt,
  ratio,
  shares,
  sourceRows,
  type DeviceShares,
  type FunnelStep,
  type Period,
  type ShareRow,
} from './model'

/**
 * Everything Statystyki shows (panel spec §12, board Statystyki), read once per request: traffic
 * from Umami (`lib/umami.ts`, cached 5 min) and inquiries, offers and sales from our database.
 * Admin only — the view calls `panelAccess` first. Only counts leave this module: no names,
 * e-mails or inquiry numbers.
 */

/** `off` = no Umami configured; `error` = configured but did not answer (both hide traffic). */
export type TrafficState = 'on' | 'off' | 'error'

export type BuildRow = {
  slug: string
  name: string
  sigil: string
  /** Visitors of `/zestawy/<slug>`; `null` without Umami. */
  views: number | null
  inquiries: number
  conversion: number | null
}

export type StatsData = {
  period: Period
  traffic: TrafficState
  visitors: number | null
  visitorsSeries: number[] | null
  inquiries: number
  inquiriesSeries: number[]
  /** Inquiries per visitor. */
  conversion: number | null
  orders: number
  ordersSeries: number[]
  /** Inquiries of the period with an offer (`offer_sent` or `won`) — funnel step 5. */
  offered: number
  /** Orders per inquiry („8,0% zapytań kończy się zakupem”). */
  orderRate: number | null
  /** Sum of prices of orders paid in the period (Krystian 02.11), whole złoty. */
  revenue: number
  revenueSeries: number[]
  average: number | null
  funnel: FunnelStep[]
  loss: string | null
  sources: ShareRow[] | null
  builds: BuildRow[]
  games: ShareRow[] | null
  devices: DeviceShares | null
  entries: ShareRow[] | null
}

const trusted = { overrideAccess: true, depth: 0, pagination: false } as const
const OFFERED = ['offer_sent', 'won'] as const
const BUILD_ROWS = 6

export async function loadStats(payload: Payload, period: Period): Promise<StatsData> {
  const range = { startAt: period.startAt, endAt: period.endAt }
  const from = new Date(period.startAt).toISOString()
  const to = new Date(period.endAt).toISOString()
  const reader = traffic()

  const [summary, details, inquiries, orders, builds, games] = await Promise.all([
    reader ? reader.summary(range) : Promise.resolve<TrafficSummary | null>(null),
    reader ? reader.details(range) : Promise.resolve<TrafficDetails | null>(null),
    payload.find({
      collection: 'inquiries',
      where: { createdAt: { greater_than_equal: from, less_than: to } },
      select: { createdAt: true, status: true, build: true },
      ...trusted,
    }),
    // Orders with any stage change in the period; the paid date is checked below.
    payload.find({
      collection: 'orders',
      where: { 'stageHistory.at': { greater_than_equal: from } },
      select: { price: true, stageHistory: true },
      ...trusted,
    }),
    payload.find({
      collection: 'builds',
      select: { slug: true, name: true, creature: { key: true } },
      ...trusted,
    }),
    payload.find({ collection: 'games', select: { slug: true, name: true }, ...trusted }),
  ])

  const state: TrafficState = !umamiConfig(getEnv()) ? 'off' : summary && details ? 'on' : 'error'
  const live = state === 'on' ? { summary: summary!, details: details! } : null

  // Database: inquiries and paid orders per Polish day of the period.
  const inquiryDays = inquiries.docs.map((d) => dayKey(d.createdAt))
  const inquiriesSeries = period.dayKeys.map((day) => inquiryDays.filter((d) => d === day).length)
  const paid = orders.docs
    .map((o) => ({ at: paidAt(o.stageHistory), price: o.price ?? null }))
    .filter(
      (o): o is { at: number; price: number | null } =>
        o.at !== null && o.at >= period.startAt && o.at < period.endAt,
    )
  const ordersPerDay = period.dayKeys.map(
    (day) => paid.filter((o) => dayKey(new Date(o.at)) === day).length,
  )
  const revenuePerDay = period.dayKeys.map((day) =>
    paid.filter((o) => dayKey(new Date(o.at)) === day).reduce((n, o) => n + (o.price ?? 0), 0),
  )
  const revenue = Math.round(revenuePerDay.reduce((n, v) => n + v, 0))
  const priced = paid.filter((o) => o.price !== null).length
  const offered = inquiries.docs.filter((d) => (OFFERED as readonly string[]).includes(d.status))
  const won = inquiries.docs.filter((d) => d.status === 'won')

  const visitors = live?.summary.visitors ?? null
  const steps = funnel([
    visitors,
    live?.details.browsedOffer ?? null,
    live?.details.finishedConfig ?? null,
    inquiries.docs.length,
    offered.length,
    won.length,
  ])

  // Builds: page visitors (Umami) next to inquiries about the build (database).
  const views = new Map<string, number>()
  for (const p of live?.details.buildPages ?? []) {
    const slug = buildSlugOf(p.name)
    if (slug) views.set(slug, (views.get(slug) ?? 0) + p.count)
  }
  const asked = new Map<number, number>()
  for (const d of inquiries.docs) {
    const id = typeof d.build === 'number' ? d.build : (d.build?.id ?? null)
    if (id !== null) asked.set(id, (asked.get(id) ?? 0) + 1)
  }
  const buildRows: BuildRow[] = builds.docs
    .map((b) => {
      const v = live ? (views.get(b.slug) ?? 0) : null
      const n = asked.get(b.id) ?? 0
      return {
        slug: b.slug,
        name: b.name,
        sigil: b.creature?.key ?? b.slug,
        views: v,
        inquiries: n,
        conversion: ratio(n, v),
      }
    })
    .filter((b) => (b.views ?? 0) > 0 || b.inquiries > 0)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0) || b.inquiries - a.inquiries)
    .slice(0, BUILD_ROWS)

  const gameName = new Map(games.docs.map((g) => [g.slug, g.name]))

  return {
    period,
    traffic: state,
    visitors,
    visitorsSeries: live ? fillDays(live.summary.daily, period.dayKeys) : null,
    inquiries: inquiries.docs.length,
    inquiriesSeries,
    conversion: ratio(inquiries.docs.length, visitors),
    orders: paid.length,
    ordersSeries: cumulative(ordersPerDay),
    orderRate: ratio(paid.length, inquiries.docs.length),
    revenue,
    revenueSeries: cumulative(revenuePerDay),
    // An order without a price counts as an order, but not in the average (review P8).
    average: priced > 0 ? Math.round(revenue / priced) : null,
    offered: offered.length,
    funnel: steps,
    loss: biggestLoss(steps),
    sources: live
      ? shares(sourceRows(live.details.channels, live.details.referrers), {
          limit: 6,
          total: visitors ?? 0,
        })
      : null,
    builds: buildRows,
    games: live
      ? shares(
          live.details.games.map((g) => ({
            label: gameName.get(g.name) ?? g.name,
            count: g.count,
          })),
          { limit: 6 },
        )
      : null,
    devices: live ? deviceShares(live.details.devices) : null,
    entries: live
      ? shares(
          live.details.entries.map((e) => ({ label: entryLabel(e.name), count: e.count })),
          { limit: 5, total: visitors ?? 0 },
        ).filter((r) => r.label !== 'Inne')
      : null,
  }
}
