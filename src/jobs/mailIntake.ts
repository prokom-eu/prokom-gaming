import type { TaskConfig } from 'payload'

import { MAIL_INTAKE_TASK } from '../lib/mail/alarm'

export type MailIntakeIO = {
  input: Record<string, never>
  output: { taken: number; unmatched: number; skipped: number; error: boolean }
}

/**
 * Reads customers' answers from the Gaming mailbox every 2 minutes (ADR-G008 pt 2). Runs never
 * overlap: Payload does not queue a scheduled task while one of it is waiting or running
 * (`defaultBeforeSchedule`, 3.91). No retries — the next run comes in 2 minutes and the error
 * count raises the alarm. Without IMAP_* the job only returns (reading is off).
 */
export const MailIntakeTask: TaskConfig<MailIntakeIO> = {
  slug: MAIL_INTAKE_TASK,
  label: 'Odbiór odpowiedzi klientów (IMAP)',
  schedule: [{ cron: '0 */2 * * * *', queue: 'default' }],
  outputSchema: [
    { name: 'taken', type: 'number', required: true },
    { name: 'unmatched', type: 'number', required: true },
    { name: 'skipped', type: 'number', required: true },
    { name: 'error', type: 'checkbox', required: true },
  ],
  retries: 0,
  handler: async ({ req }) => {
    const { runMailIntake } = await import('./runMailIntake')
    return { output: await runMailIntake(req) }
  },
}
