import 'server-only'

import type { Payload } from 'payload'

import { getEnv, umamiConfig } from '../../lib/env'
import { errorFields, log } from '../../lib/logger'
import { notify } from '../../lib/notify'
import { loadPrices } from '../dashboard/load'
import { loadStats } from './load'
import { previousWeek } from './model'
import { isWeeklyDue, weeklyReportText, type WeeklyData } from './weeklyText'

/**
 * The Monday report (job `weekly-report`, P8): once on Monday from 07:00, the past week (Monday to
 * Sunday) to ALERT_EMAIL through `notify-send`. Switches in Settings: prices and margins, traffic;
 * both off = nothing. Logs counts only. Returns whether a report was queued.
 */
export async function runWeeklyReport(payload: Payload, now = new Date()): Promise<boolean> {
  const settings = await payload.findGlobal({
    slug: 'price-check-settings',
    depth: 0,
    overrideAccess: true,
  })
  const withPrices = settings.weeklyPrices ?? true
  const withTraffic = settings.weeklyTraffic ?? true
  if (!withPrices && !withTraffic) return false
  if (!isWeeklyDue(now, settings.weeklyReportSentAt)) return false

  try {
    const period = previousWeek(now)
    const [stats, prices] = await Promise.all([
      loadStats(payload, period),
      withPrices ? loadPrices(payload) : null,
    ])
    const data: WeeklyData = {
      from: period.dayKeys[0]!,
      to: period.dayKeys.at(-1)!,
      traffic: !withTraffic
        ? 'off'
        : stats.traffic === 'on' && stats.visitors !== null
          ? { visitors: stats.visitors, conversion: stats.conversion }
          : umamiConfig(getEnv())
            ? 'missing'
            : 'off',
      sales: {
        inquiries: stats.inquiries,
        offered: stats.offered,
        orders: stats.orders,
        revenue: stats.revenue,
      },
      prices: !prices
        ? 'off'
        : prices.ok
          ? {
              average: prices.view.average.today ?? null,
              lowest: prices.view.lowest.today ?? null,
              minMargin: prices.view.minMargin,
              queue: prices.view.queueCount,
            }
          : 'missing',
      statsUrl: `${getEnv().SITE_URL}${payload.config.routes.admin}/statystyki?okres=7`,
    }
    // The date first: a failure after queueing must not send the report again an hour later.
    const mark = (at: string | null) =>
      payload.updateGlobal({
        slug: 'price-check-settings',
        data: { weeklyReportSentAt: at },
        depth: 0,
        overrideAccess: true,
      })
    await mark(now.toISOString())
    try {
      await notify(payload, { kind: 'weekly_report', push: null, email: weeklyReportText(data) })
    } catch (error) {
      await mark(settings.weeklyReportSentAt ?? null)
      throw error
    }
    log.info({ inquiries: stats.inquiries, orders: stats.orders }, 'weekly report queued')
    return true
  } catch (error) {
    log.error({ ...errorFields(error) }, 'weekly report failed')
    return false
  }
}
