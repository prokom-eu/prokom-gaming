import type { TaskConfig } from 'payload'

export const PRICE_CHECK_TASK = 'price-check'
export const PRICE_CHECK_SCHEDULER_TASK = 'price-check-scheduler'
export const PRICE_CHECK_QUEUE = 'long'

export type PriceCheckIO = {
  input: { checkId: number }
  output: { status: string }
}

/**
 * One price check (ADR-G007 §2): reads offers through Claude, searches for missing ones,
 * recomputes in lib/pricing and writes the report. In its own queue (`long`), so a 15-minute run
 * never holds back mail intake and alarms. Never retried: a run costs money; a failed one ends
 * as `failed` with its progress saved.
 */
export const PriceCheckTask: TaskConfig<PriceCheckIO> = {
  slug: PRICE_CHECK_TASK,
  label: 'Sprawdzanie cen (Claude)',
  inputSchema: [{ name: 'checkId', type: 'number', required: true }],
  outputSchema: [{ name: 'status', type: 'text', required: true }],
  retries: 0,
  handler: async ({ input, req }) => {
    const { runPriceCheck } = await import('../lib/price-check/run')
    return { output: { status: await runPriceCheck(req.payload, input.checkId) } }
  },
}

export type PriceCheckSchedulerIO = {
  input: Record<string, never>
  output: { queued: boolean }
}

/**
 * The schedule of `price-check-settings` (days, hour): Payload's own schedules live in the
 * config, so this hourly job reads the settings and queues a check when its time has come
 * (panel spec §11).
 */
export const PriceCheckSchedulerTask: TaskConfig<PriceCheckSchedulerIO> = {
  slug: PRICE_CHECK_SCHEDULER_TASK,
  label: 'Harmonogram sprawdzania cen',
  // Seconds first: at minute 2 of every hour.
  schedule: [{ cron: '0 2 * * * *', queue: 'default' }],
  outputSchema: [{ name: 'queued', type: 'checkbox', required: true }],
  retries: 0,
  handler: async ({ req }) => {
    const { runPriceCheckScheduler } = await import('../lib/price-check/scheduler')
    return { output: { queued: await runPriceCheckScheduler(req.payload) } }
  },
}
