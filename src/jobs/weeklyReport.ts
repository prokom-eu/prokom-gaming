import type { TaskConfig } from 'payload'

export const WEEKLY_REPORT_TASK = 'weekly-report'

export type WeeklyReportIO = {
  input: Record<string, never>
  output: { sent: boolean }
}

/**
 * The Monday report (panel spec §13, P8): traffic, sales, prices and margins of the past week to
 * ALERT_EMAIL. Runs every hour and sends once, on Monday from 07:00 Polish time — the time zone is
 * ours, not the server's cron, and a server down at 07:00 still sends later that day.
 */
export const WeeklyReportTask: TaskConfig<WeeklyReportIO> = {
  slug: WEEKLY_REPORT_TASK,
  label: 'Raport tygodniowy',
  // Seconds first: at minute 5 of every hour (after the price check scheduler at minute 2).
  schedule: [{ cron: '0 5 * * * *', queue: 'default' }],
  outputSchema: [{ name: 'sent', type: 'checkbox', required: true }],
  retries: 0,
  handler: async ({ req }) => {
    const { runWeeklyReport } = await import('../admin/stats/weekly')
    return { output: { sent: await runWeeklyReport(req.payload) } }
  },
}
