import 'server-only'

import type { PayloadRequest, Where } from 'payload'
import webpush from 'web-push'

import { MAX_PUSH_FAILS } from '../collections/PushSubscriptions'
import { getEnv, vapidConfig } from '../lib/env'
import { errorFields } from '../lib/logger'
import type { NotifyChannel, NotifyEvent } from '../lib/notify'
import { pushContent } from '../lib/notify/content'
import { deliverPush, type PushOutcome } from '../lib/notify/deliver'
import { CHANNELS } from '../lib/notify/kinds'
import { pushTargets, type Subscription } from '../lib/notify/recipients'
import type { NotifySendIO } from './notifySend'

/** A push older than an hour is not worth showing (an alarm from yesterday helps nobody). */
const TTL_SECONDS = 3600

/** Logs kinds, ids and counts only — never the text or an endpoint. */
export async function runNotifySend(
  req: PayloadRequest,
  event: NotifyEvent,
  channel: NotifyChannel,
): Promise<NotifySendIO['output']> {
  const { payload } = req
  const env = getEnv()
  const result = { emailed: false, pushed: 0, failed: 0, gone: 0 }

  // E-mail — throws on SMTP failure, so the job is retried (the push is its own job).
  if (channel === 'email' && event.kind !== 'test' && CHANNELS[event.kind].email && event.email) {
    if (env.ALERT_EMAIL) {
      await payload.sendEmail({ to: env.ALERT_EMAIL, ...event.email })
      result.emailed = true
    } else {
      payload.logger.warn({ kind: event.kind }, 'Notify: ALERT_EMAIL not set, no e-mail sent')
    }
  }

  // Push.
  const vapid = vapidConfig(env)
  if (channel !== 'push' || !vapid || !event.push) return result
  const where: Where =
    event.kind === 'test'
      ? { id: { equals: event.subscription } }
      : { disabledAt: { exists: false } }
  const { docs } = await payload.find({
    collection: 'push-subscriptions',
    where,
    populate: { users: { role: true } },
    pagination: false,
    depth: 1,
    overrideAccess: true,
    showHiddenFields: true,
    req,
  })
  const subs: (Subscription & { failCount: number })[] = docs.map((d) => ({
    id: d.id,
    endpoint: d.endpoint,
    p256dh: d.p256dh,
    auth: d.auth,
    kinds: d.kinds ?? [],
    disabled: Boolean(d.disabledAt),
    role: typeof d.user === 'object' && d.user?.role === 'admin' ? 'admin' : 'serwis',
    failCount: d.failCount ?? 0,
  }))
  // The test goes to its one device, whatever it chose; a success switches it back on.
  const targets = event.kind === 'test' ? subs : pushTargets(subs, event.kind)
  if (targets.length === 0) return result

  const outcomes = await deliverPush(
    targets,
    pushContent(event.push, payload.config.routes.admin),
    (subscription, body) =>
      webpush.sendNotification(subscription, body, {
        vapidDetails: vapid,
        TTL: TTL_SECONDS,
        urgency: 'high',
        timeout: 10_000,
      }),
  )
  const now = new Date().toISOString()
  for (const outcome of outcomes) {
    await applyOutcome(req, outcome, subs.find((s) => s.id === outcome.id)?.failCount ?? 0, now)
    result[outcome.outcome === 'ok' ? 'pushed' : outcome.outcome] += 1
  }
  payload.logger.info({ kind: event.kind, ...result }, 'Notify sent')
  return result
}

async function applyOutcome(
  req: PayloadRequest,
  outcome: PushOutcome,
  failCount: number,
  now: string,
): Promise<void> {
  const { payload } = req
  try {
    if (outcome.outcome === 'gone') {
      await payload.delete({
        collection: 'push-subscriptions',
        id: outcome.id,
        overrideAccess: true,
        req,
      })
      return
    }
    const fails = outcome.outcome === 'ok' ? 0 : failCount + 1
    await payload.update({
      collection: 'push-subscriptions',
      id: outcome.id,
      data:
        outcome.outcome === 'ok'
          ? { lastOkAt: now, failCount: 0, disabledAt: null }
          : { failCount: fails, ...(fails >= MAX_PUSH_FAILS ? { disabledAt: now } : {}) },
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (outcome.outcome === 'failed') {
      payload.logger.warn(
        { subscription: outcome.id, statusCode: outcome.statusCode, fails },
        'Push not delivered',
      )
    }
  } catch (error) {
    payload.logger.error(
      { subscription: outcome.id, ...errorFields(error) },
      'Push state not saved',
    )
  }
}
