import 'server-only'

import type { PayloadRequest } from 'payload'

import { getEnv } from '../lib/env'
import { errorFields } from '../lib/logger'
import { notify } from '../lib/notify'
import { DEFAULT_REPLY_HOURS } from '../lib/inquiry/sla'
import { dueAlarms, slaAlarmEmail } from '../lib/inquiry/slaAlarm'
import { inquiryPanelPath, inquiryTopic } from '../lib/inquiry/subject'

/** Older inquiries are not chased any more: an alarm days late helps nobody. */
const LOOKBACK_MS = 7 * 86_400_000

export async function runInquirySla(req: PayloadRequest): Promise<{ alerted: number }> {
  const { payload } = req
  const env = getEnv()
  const now = new Date()
  const [settings, { docs }] = await Promise.all([
    payload.findGlobal({ slug: 'mail-settings', depth: 0, overrideAccess: true, req }),
    payload.find({
      collection: 'inquiries',
      where: {
        and: [
          { status: { equals: 'new' } },
          { slaAlertedAt: { exists: false } },
          { createdAt: { greater_than: new Date(now.getTime() - LOOKBACK_MS).toISOString() } },
        ],
      },
      select: {
        number: true,
        type: true,
        budget: true,
        voucher: true,
        build: true,
        createdAt: true,
      },
      populate: { builds: { name: true } },
      depth: 1,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  ])
  const hours = settings.replyHours ?? DEFAULT_REPLY_HOURS
  const waiting = docs.map((doc) => ({
    id: doc.id,
    number: doc.number ?? `#${doc.id}`,
    createdAt: doc.createdAt,
    topic: inquiryTopic({
      type: doc.type,
      buildName: typeof doc.build === 'object' ? doc.build?.name : null,
      budget: doc.budget,
      voucherAmount: doc.voucher?.amount,
    }),
  }))

  let alerted = 0
  for (const inquiry of dueAlarms(waiting, now, hours, settings.replyAlarmMinutes ?? 45)) {
    // E-mail and push through `notify-send` (panel spec §14); the job retries a failed SMTP.
    const { subject, text } = slaAlarmEmail(inquiry, {
      panelUrl: `${env.SITE_URL}${inquiryPanelPath(inquiry.number)}`,
    })
    try {
      await notify(
        payload,
        {
          kind: 'inquiry_sla',
          push: {
            kind: 'inquiry_sla',
            number: inquiry.number,
            topic: inquiry.topic,
            waited: inquiry.waited,
          },
          email: { subject, text },
        },
        { req },
      )
    } catch (error) {
      payload.logger.error(
        { inquiry: inquiry.id, ...errorFields(error) },
        'Inquiry SLA alarm not queued',
      )
      continue
    }
    alerted += 1
    // Queued: a failed mark must not stop the other alarms (it repeats in 5 min — rare).
    try {
      await payload.update({
        collection: 'inquiries',
        id: inquiry.id,
        data: { slaAlertedAt: now.toISOString() },
        depth: 0,
        overrideAccess: true,
        req,
      })
    } catch (error) {
      payload.logger.error(
        { inquiry: inquiry.id, ...errorFields(error) },
        'Inquiry SLA mark not saved',
      )
    }
  }
  if (alerted > 0) payload.logger.info({ alerted }, 'Inquiry SLA alarms sent')
  return { alerted }
}
