import type { TaskConfig } from 'payload'

import { INQUIRY_SLA_TASK } from '../lib/inquiry/slaAlarm'

export type InquirySlaIO = {
  input: Record<string, never>
  output: { alerted: number }
}

/**
 * Alarm for new inquiries without a reply (ADR-G008 pt 6, panel spec §4): every 5 minutes, one
 * e-mail to `ALERT_EMAIL` per inquiry, marked with `slaAlertedAt`. Logs ids and counts only.
 */
export const InquirySlaTask: TaskConfig<InquirySlaIO> = {
  slug: INQUIRY_SLA_TASK,
  label: 'Alarm: zapytanie bez odpowiedzi',
  // Seconds first; `schedule` queues the job, the `autoRun` cron runs it.
  schedule: [{ cron: '0 */5 * * * *', queue: 'default' }],
  outputSchema: [{ name: 'alerted', type: 'number', required: true }],
  retries: 1,
  handler: async ({ req }) => {
    const { runInquirySla } = await import('./runInquirySla')
    return { output: await runInquirySla(req) }
  },
}
