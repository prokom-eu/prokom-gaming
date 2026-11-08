import type { TaskConfig } from 'payload'

import type { NotifyChannel, NotifyEvent } from '../lib/notify'
import { NOTIFY_SEND_TASK } from '../lib/notify/kinds'

export type NotifySendIO = {
  input: { event: NotifyEvent; channel: NotifyChannel }
  output: { emailed: boolean; pushed: number; failed: number; gone: number }
}

/**
 * Sends one event on one channel (ADR-G010 pt 5, panel spec §14; `notify()` queues a job per
 * channel). E-mail: a failed SMTP throws and the job is retried. Push: failures are handled per
 * device and never thrown, so a push is never sent twice.
 */
export const NotifySendTask: TaskConfig<NotifySendIO> = {
  slug: NOTIFY_SEND_TASK,
  label: 'Powiadomienie (e-mail i push)',
  inputSchema: [
    { name: 'event', type: 'json', required: true },
    { name: 'channel', type: 'text', required: true },
  ],
  outputSchema: [
    { name: 'emailed', type: 'checkbox', required: true },
    { name: 'pushed', type: 'number', required: true },
    { name: 'failed', type: 'number', required: true },
    { name: 'gone', type: 'number', required: true },
  ],
  retries: 2,
  handler: async ({ input, req }) => {
    const { runNotifySend } = await import('./runNotifySend')
    return { output: await runNotifySend(req, input.event, input.channel) }
  },
}
