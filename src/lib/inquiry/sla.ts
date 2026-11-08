/**
 * Reply time of inquiries (panel spec §3–§4, ADR-G008 pt 6). The promise on the site is „answer
 * within an hour, 8–22”, so waiting is counted only inside the reply hours, in Polish time:
 * an inquiry sent at 23:00 has waited 45 minutes at 8:45. Pure and browser-safe.
 */

export type ReplyHours = { from: number; to: number }

export const DEFAULT_REPLY_HOURS: ReplyHours = { from: 8, to: 22 }

const DAY_MS = 86_400_000

const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function local(ms: number) {
  const found = new Map(parts.formatToParts(ms).map((p) => [p.type, p.value]))
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(found.get(type))
  return {
    y: get('year'),
    m: get('month'),
    d: get('day'),
    h: get('hour'),
    min: get('minute'),
    s: get('second'),
  }
}

/** Instant of `hour`:00 Polish time on a given Polish date. */
function warsawHour(y: number, m: number, d: number, hour: number): number {
  const guess = Date.UTC(y, m - 1, d, hour)
  const p = local(guess)
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - guess
  return guess - offset
}

/** Whole minutes between `start` and `end` that fall inside the reply hours (Polish time). */
export function minutesInReplyHours(
  start: Date | string,
  end: Date | string,
  hours: ReplyHours = DEFAULT_REPLY_HOURS,
): number {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (!(endMs > startMs) || !(hours.to > hours.from)) return 0

  const first = local(startMs)
  const last = local(endMs)
  const lastDay = Date.UTC(last.y, last.m - 1, last.d)
  let total = 0
  for (let day = Date.UTC(first.y, first.m - 1, first.d); day <= lastDay; day += DAY_MS) {
    const date = new Date(day)
    const [y, m, d] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    const open = Math.max(warsawHour(y, m, d, hours.from), startMs)
    const close = Math.min(warsawHour(y, m, d, hours.to), endMs)
    if (close > open) total += close - open
  }
  return Math.floor(total / 60_000)
}

/** Colour of the waiting time on the list: orange until the promise is broken, red after. */
export function slaTone(waitingMinutes: number, slaMinutes: number): 'warn' | 'bad' {
  return waitingMinutes >= slaMinutes ? 'bad' : 'warn'
}

/** „34 min”, „1 h 21 min”, „2 h” — wall-clock waiting shown on the list. */
export function waitLabel(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h >= 48) return `${Math.floor(h / 24)} dni`
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`
}
