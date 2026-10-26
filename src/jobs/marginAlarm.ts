import type { TaskConfig } from 'payload'

import { MARGIN_ALARM_TASK } from './queue'

export type MarginAlarmIO = {
  input: { reason: string }
  output: { published: number | null; alarmed: boolean; levels: string[] }
}

/**
 * Margin-alarm task (ADR-G002 §4.2–§4.4). The handler is loaded only when the job runs: it uses
 * the server-only cost layer, which must stay out of the config the Payload CLI loads.
 */
export const MarginAlarmTask: TaskConfig<MarginAlarmIO> = {
  slug: MARGIN_ALARM_TASK,
  label: 'Alarm marży',
  inputSchema: [{ name: 'reason', type: 'text', required: true }],
  outputSchema: [
    { name: 'published', type: 'number' },
    { name: 'alarmed', type: 'checkbox', required: true },
    { name: 'levels', type: 'json', required: true },
  ],
  retries: 2,
  handler: async ({ input, req }) => {
    const { runMarginAlarm } = await import('./runMarginAlarm')
    return { output: await runMarginAlarm(req.payload, input.reason) }
  },
}
