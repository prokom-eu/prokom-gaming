import { dayKey } from './rules'

/**
 * Day series of the Pulpit tiles (30 days, Polish calendar days). Pure — the loader passes the
 * dates it read.
 */

export const SERIES_DAYS = 30

/** The last `days` Polish days, oldest first, ending today: ['2026-10-02', …, '2026-10-31']. */
export function lastDays(now: Date, days = SERIES_DAYS): string[] {
  const today = dayKey(now)
  const noon = new Date(`${today}T12:00:00Z`)
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(noon)
    d.setUTCDate(d.getUTCDate() - (days - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

/** How many of the instants fall on each day; instants outside the days are ignored. */
export function countByDay(instants: readonly string[], days: readonly string[]): number[] {
  const index = new Map(days.map((d, i) => [d, i]))
  const counts = days.map(() => 0)
  for (const at of instants) {
    const i = index.get(dayKey(at))
    if (i !== undefined) counts[i]!++
  }
  return counts
}

/** Plain mean of the known margins; `null` when none is known. */
export function averageMargin(margins: readonly (number | null)[]): number | null {
  const known = margins.filter((m): m is number => m !== null && Number.isFinite(m))
  return known.length === 0 ? null : known.reduce((a, b) => a + b, 0) / known.length
}
