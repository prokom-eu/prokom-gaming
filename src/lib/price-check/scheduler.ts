import 'server-only'

import type { Payload } from 'payload'

import { PRICE_CHECK_QUEUE, PRICE_CHECK_TASK } from '../../jobs/priceCheck'
import { log } from '../logger'
import { readerFor } from './run'

type Day = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

/** Day and hour now in Polish time. */
export function warsawNow(now: Date): { day: Day; hour: number; date: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const day = get('weekday').toLowerCase().slice(0, 3) as Day
  return { day, hour: Number(get('hour')), date: `${get('year')}-${get('month')}-${get('day')}` }
}

/** Is a scheduled run due now (right day, right hour)? Pure, tested. */
export function isDue(now: Date, days: readonly string[], hour: number): boolean {
  const w = warsawNow(now)
  return days.includes(w.day) && w.hour === hour
}

/**
 * A run „w toku” longer than this was cut off (restart, deploy): a run stops itself at 30 min
 * (`MAX_MINUTES` in run.ts), plus the wait for the job cron and the call still running — keep
 * this well above it, or a long full search is marked failed mid-run.
 */
export const STALE_MINUTES = 45

/**
 * Marks runs stuck in `running` (the server restarted mid-run) as `failed`, so they never block
 * „Sprawdź ceny”, the schedule or a report page forever (review P7). Returns how many.
 */
export async function expireStaleChecks(payload: Payload, now = new Date()): Promise<number> {
  const stale = await payload.find({
    collection: 'price-checks',
    where: {
      status: { equals: 'running' },
      startedAt: { less_than: new Date(now.getTime() - STALE_MINUTES * 60_000).toISOString() },
    },
    select: { status: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  for (const check of stale.docs) {
    await payload.update({
      collection: 'price-checks',
      id: check.id,
      // TODO(krystian): wording (no board).
      data: {
        status: 'failed',
        finishedAt: now.toISOString(),
        error: 'Sprawdzanie przerwane (restart serwera?) — uruchom je jeszcze raz.',
      },
      depth: 0,
      overrideAccess: true,
    })
  }
  if (stale.docs.length > 0) log.warn({ count: stale.docs.length }, 'stale price checks expired')
  return stale.docs.length
}

/**
 * Starts a price check (button or schedule): one run at a time, never without Claude. Returns
 * the new check's id, or why not.
 */
export async function startPriceCheck(
  payload: Payload,
  trigger: 'manual' | 'schedule',
): Promise<{ ok: true; id: number } | { ok: false; reason: 'running' | 'no-key' }> {
  if (!readerFor()) return { ok: false, reason: 'no-key' }
  await expireStaleChecks(payload)
  const running = await payload.count({
    collection: 'price-checks',
    where: { status: { equals: 'running' } },
    overrideAccess: true,
  })
  if (running.totalDocs > 0) return { ok: false, reason: 'running' }
  const check = await payload.create({
    collection: 'price-checks',
    data: {
      trigger,
      status: 'running',
      startedAt: new Date().toISOString(),
      progress: 0,
      step: 'W kolejce',
    },
    depth: 0,
    overrideAccess: true,
  })
  await payload.jobs.queue({
    task: PRICE_CHECK_TASK,
    queue: PRICE_CHECK_QUEUE,
    input: { checkId: check.id },
    overrideAccess: true,
  })
  return { ok: true, id: check.id }
}

/** Hourly: queue a check when the schedule of `price-check-settings` says so. */
export async function runPriceCheckScheduler(payload: Payload): Promise<boolean> {
  const settings = await payload.findGlobal({
    slug: 'price-check-settings',
    depth: 0,
    overrideAccess: true,
  })
  const now = new Date()
  if (!isDue(now, settings.days ?? [], settings.hour ?? 6)) return false
  // Once per day and hour: a check already started in this clock hour (manual or not) is
  // enough. Polish time differs from UTC by whole hours, so the UTC hour boundary is the same.
  const hourStart = new Date(now)
  hourStart.setUTCMinutes(0, 0, 0)
  const since = hourStart.toISOString()
  const recent = await payload.count({
    collection: 'price-checks',
    where: { startedAt: { greater_than_equal: since } },
    overrideAccess: true,
  })
  if (recent.totalDocs > 0) return false
  const started = await startPriceCheck(payload, 'schedule')
  if (!started.ok) log.info({ reason: started.reason }, 'scheduled price check skipped')
  return started.ok
}
