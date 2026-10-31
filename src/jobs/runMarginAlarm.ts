import 'server-only'

import type { Payload } from 'payload'

import { getEnv } from '../lib/env'
import { log } from '../lib/logger'
import { marginAlarmMail } from '../lib/pricing/alarm'
import { buildQueue, buildsOverview } from '../lib/pricing/publish'
import { loadBatch, loadOffer } from '../lib/pricing/store'
import type { MarginAlarmIO } from './marginAlarm'

/**
 * After costs changed (CSV import or an edit in the panel): if a price on the site breaks the
 * minimum margin at today's costs, e-mail `ALERT_EMAIL`. Nothing is ever published or changed
 * here — publication is always manual, through the queue and the guard (ADR-G002 §4.4; panel
 * spec §0 pt 3: `autoPublish` was removed in P1 and is ignored even if stored as true).
 */
export async function runMarginAlarm(
  payload: Payload,
  reason: string,
): Promise<MarginAlarmIO['output']> {
  const offer = await loadOffer(payload)
  const current = await loadBatch(payload)
  if (!current) return { alarmed: false, levels: [] }

  const { settings } = offer.catalog
  const queue = buildQueue(offer.catalog, current.snapshot)
  const builds = buildsOverview(offer.builds, offer.catalog, current.snapshot, null)
  const screen = `${payload.config.routes.admin}/ceny`
  const mail = marginAlarmMail(queue.brokenLevels, builds, settings.minMargin, screen)
  const levels = queue.brokenLevels.map((p) => p.level)
  if (!mail) return { alarmed: false, levels }

  const to = getEnv().ALERT_EMAIL
  if (!to) {
    log.warn({ levels, reason }, 'margin alarm: ALERT_EMAIL not set, mail not sent')
    return { alarmed: false, levels }
  }
  await payload.sendEmail({ to, subject: mail.subject, text: mail.text })
  log.warn({ levels, reason }, 'margin alarm sent')
  return { alarmed: true, levels }
}
