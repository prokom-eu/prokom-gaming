import 'server-only'

import type { Payload } from 'payload'

import { getEnv } from '../lib/env'
import { log } from '../lib/logger'
import { marginAlarmMail } from '../lib/pricing/alarm'
import { buildQueue, buildsOverview, planPublication } from '../lib/pricing/publish'
import { loadBatch, loadOffer, writeBatch } from '../lib/pricing/store'
import type { MarginAlarmIO } from './marginAlarm'

/**
 * After costs changed (CSV import or an edit in the panel):
 * 1. with `autoPublish` on, publish the whole queue — only if the margin guard lets it through;
 * 2. if a price on the site still breaks the minimum margin, e-mail `ALERT_EMAIL`. Prices are
 *    never changed to fix it automatically (ADR-G002 §4.4).
 */
export async function runMarginAlarm(
  payload: Payload,
  reason: string,
): Promise<MarginAlarmIO['output']> {
  const offer = await loadOffer(payload)
  let current = await loadBatch(payload)
  if (!current) return { published: null, alarmed: false, levels: [] }

  let published: number | null = null
  const { settings } = offer.catalog
  const pricing = await payload.findGlobal({ slug: 'pricing-settings', overrideAccess: true })
  if (pricing.autoPublish) {
    const queue = buildQueue(offer.catalog, current.snapshot)
    if (queue.items.length > 0) {
      const plan = planPublication(
        offer.catalog,
        current.snapshot,
        queue.items.map((i) => i.key),
      )
      if (plan.ok) {
        published = (await writeBatch(payload, plan, null, current.snapshot.batch)).batch
        log.info(
          { batch: published, changed: plan.changes.length, reason },
          'prices auto-published',
        )
        current = (await loadBatch(payload)) ?? current
      } else {
        log.warn({ problems: plan.problems.length, reason }, 'auto-publish blocked by the guard')
      }
    }
  }

  const queue = buildQueue(offer.catalog, current.snapshot)
  const builds = buildsOverview(offer.builds, offer.catalog, current.snapshot, null)
  const screen = `${payload.config.routes.admin}/ceny`
  const mail = marginAlarmMail(queue.brokenLevels, builds, settings.minMargin, screen)
  const levels = queue.brokenLevels.map((p) => p.level)
  if (!mail) return { published, alarmed: false, levels }

  const to = getEnv().ALERT_EMAIL
  if (!to) {
    log.warn({ levels, reason }, 'margin alarm: ALERT_EMAIL not set, mail not sent')
    return { published, alarmed: false, levels }
  }
  await payload.sendEmail({ to, subject: mail.subject, text: mail.text })
  log.warn({ levels, reason }, 'margin alarm sent')
  return { published, alarmed: true, levels }
}
