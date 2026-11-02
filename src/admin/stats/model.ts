import type { OrderStage } from '../../lib/orders'
import type { DayCount, Share } from '../../lib/umami'
import { dayKey } from '../dashboard/rules'
import { lastDays } from '../dashboard/series'

/**
 * Pure parts of Statystyki (panel spec §12): the period, day series, the funnel, shares and the
 * paid date of an order. The loader passes what it read — no database, no network.
 */

export const PERIODS = [7, 30] as const
export type PeriodDays = (typeof PERIODS)[number]

/** `?okres=7` → 7; anything else → 30 (the board opens on 30 days). */
export function periodOf(value: unknown): PeriodDays {
  return value === '7' ? 7 : 30
}

const HOUR_MS = 3_600_000
const FIVE_MIN_MS = 5 * 60_000

/** The instant a Polish day starts (00:00 Europe/Warsaw — CET or CEST). */
export function warsawMidnight(day: string): number {
  const utc = Date.parse(`${day}T00:00:00Z`)
  for (const offset of [1, 2]) {
    const t = utc - offset * HOUR_MS
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Warsaw',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(t))
    if (dayKey(new Date(t)) === day && parts === '00') return t
  }
  return utc - HOUR_MS
}

export type Period = {
  days: PeriodDays
  /** Polish days of the period, oldest first, ending today. */
  dayKeys: string[]
  startAt: number
  /** Now, rounded down to 5 minutes — the same range for 5 minutes keeps Umami's answers cached. */
  endAt: number
}

export function periodRange(now: Date, days: PeriodDays): Period {
  const dayKeys = lastDays(now, days)
  return {
    days,
    dayKeys,
    startAt: warsawMidnight(dayKeys[0]!),
    endAt: Math.floor(now.getTime() / FIVE_MIN_MS) * FIVE_MIN_MS,
  }
}

/** A value for every day of the period (missing days = 0), oldest first. */
export function fillDays(rows: readonly DayCount[], dayKeys: readonly string[]): number[] {
  const byDay = new Map(rows.map((r) => [r.day, r.count]))
  return dayKeys.map((d) => byDay.get(d) ?? 0)
}

/** Running total (the orders and revenue tiles draw a rising line, board Statystyki). */
export function cumulative(values: readonly number[]): number[] {
  let sum = 0
  return values.map((v) => (sum += v))
}

/** Stages from „Opłacone” on: the money is in (Krystian 02.11: revenue counts from payment). */
export const PAID_STAGES: readonly OrderStage[] = [
  'paid',
  'parts',
  'assembly',
  'test',
  'metric_ready',
  'shipped',
  'delivered',
]

/**
 * When an order was paid: the first entry of `stageHistory` in „Opłacone” or later (an order
 * moved past „Opłacone” in the Payload form still counts once). `null` = not paid yet.
 */
export function paidAt(history: readonly { stage: string; at: string }[] | null | undefined) {
  const times = (history ?? [])
    .filter((h) => (PAID_STAGES as readonly string[]).includes(h.stage))
    .map((h) => Date.parse(h.at))
    .filter((t) => Number.isFinite(t))
  return times.length === 0 ? null : Math.min(...times)
}

/** `part / whole` as a fraction; `null` when the whole is 0 or unknown. */
export function ratio(part: number | null, whole: number | null): number | null {
  if (part === null || whole === null || whole <= 0) return null
  return part / whole
}

export type FunnelStep = {
  label: string
  /** `null` = the source is off (no Umami) — the step is not shown. */
  count: number | null
  /** Share of the previous shown step; `null` for the first step. */
  fromPrevious: number | null
}

/** Board Statystyki: six steps from the visit to the order. */
export const FUNNEL_LABELS = [
  'Odwiedzający',
  'Obejrzeli zestaw albo konfigurator',
  'Skończyli konfigurację',
  'Wysłali zapytanie',
  'Dostali ofertę',
  'Zamówili',
] as const

// TODO(krystian): the sentence on the biggest loss — the board has only „między konfiguratorem a
// zapytaniem”; the other step names (instrumental case) are ours.
const STEP_NAMES = [
  'wejściem',
  'oglądaniem oferty',
  'konfiguratorem',
  'zapytaniem',
  'ofertą',
  'zamówieniem',
] as const

export function funnel(counts: readonly (number | null)[]): FunnelStep[] {
  let previous: number | null = null
  return FUNNEL_LABELS.map((label, i) => {
    const count = counts[i] ?? null
    const step: FunnelStep = {
      label,
      count,
      fromPrevious: count === null ? null : ratio(count, previous),
    }
    if (count !== null) previous = count
    return step
  })
}

/** „Największa strata między konfiguratorem a zapytaniem…” — the lowest step-to-step share. */
export function biggestLoss(steps: readonly FunnelStep[]): string | null {
  let worst: { from: number; to: number; share: number } | null = null
  let previous = -1
  for (const [i, step] of steps.entries()) {
    if (step.count === null) continue
    if (previous >= 0 && step.fromPrevious !== null && step.fromPrevious < (worst?.share ?? 2)) {
      worst = { from: previous, to: i, share: step.fromPrevious }
    }
    previous = i
  }
  if (!worst) return null
  return `Największa strata między ${STEP_NAMES[worst.from]} a ${STEP_NAMES[worst.to]}, tam warto szukać poprawek.`
}

export type ShareRow = { label: string; share: number }

/**
 * Top `limit` rows as shares of `total` (or of their sum) plus „Inne” for the rest, so the bars
 * add up to the whole. Rows with the same label are merged first.
 */
export function shares(
  rows: readonly { label: string; count: number }[],
  { limit = 6, total }: { limit?: number; total?: number } = {},
): ShareRow[] {
  const merged = new Map<string, number>()
  for (const r of rows) merged.set(r.label, (merged.get(r.label) ?? 0) + r.count)
  const sorted = [...merged].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pl'))
  const whole = Math.max(
    total ?? 0,
    sorted.reduce((n, [, c]) => n + c, 0),
  )
  if (whole <= 0) return []
  const top = sorted.slice(0, limit)
  const rest = whole - top.reduce((n, [, c]) => n + c, 0)
  const out = top.map(([label, c]) => ({ label, share: c / whole }))
  // TODO(krystian): „Inne” — on the board under „Skąd przychodzą” only.
  if (rest > 0) out.push({ label: 'Inne', share: rest / whole })
  return out
}

/** Referrer domain → the name on the board („Google (wyszukiwarka)”, „Facebook”…). */
export function sourceLabel(domain: string): string {
  const d = domain.toLowerCase().replace(/^www\./, '')
  const known: [RegExp, string][] = [
    [/(^|\.)google\./, 'Google (wyszukiwarka)'],
    [/(^|\.)bing\.com$/, 'Bing'],
    [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'],
    [/(^|\.)tiktok\.com$/, 'TikTok'],
    [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
    [/(^|\.)instagram\.com$/, 'Instagram'],
    [/(^|\.)ceneo\.pl$/, 'Ceneo'],
  ]
  return known.find(([re]) => re.test(d))?.[1] ?? d
}

/** Where visitors come from: direct entries (channel `direct`) + referrer domains. */
export function sourceRows(channels: readonly Share[], referrers: readonly Share[]) {
  const direct = channels.find((c) => c.name === 'direct')?.count ?? 0
  return [
    ...(direct > 0 ? [{ label: 'Wejścia bezpośrednie', count: direct }] : []),
    ...referrers.filter((r) => r.name).map((r) => ({ label: sourceLabel(r.name), count: r.count })),
  ]
}

export type DeviceShares = { phone: number; computer: number; tablet: number }

/** Umami devices (`mobile`, `laptop`, `desktop`, `tablet`) → the three of the board. */
export function deviceShares(devices: readonly Share[]): DeviceShares | null {
  const count = (names: string[]) =>
    devices.filter((d) => names.includes(d.name)).reduce((n, d) => n + d.count, 0)
  const phone = count(['mobile'])
  const computer = count(['laptop', 'desktop'])
  const tablet = count(['tablet'])
  const all = phone + computer + tablet
  if (all === 0) return null
  return { phone: phone / all, computer: computer / all, tablet: tablet / all }
}

/** `/zestawy/wampir` → `wampir`; other paths → `null`. */
export function buildSlugOf(path: string): string | null {
  return /^\/zestawy\/([a-z0-9-]+)\/?$/.exec(path)?.[1] ?? null
}

/** „/zestawy” → „/zestawy”, „/” → „/ (strona główna)” (board). */
export function entryLabel(path: string): string {
  return path === '/' ? '/ (strona główna)' : path
}

const GROUP = /\B(?=(\d{3})+(?!\d))/g

/** „6 775” — grouped like the board (non-breaking space). */
export const num = (value: number | null): string =>
  value === null ? '—' : String(Math.round(value)).replace(GROUP, ' ')

/** „1,65%”, „46,0%”, „44%” — `digits` after the comma. */
export const pct = (value: number | null, digits = 1): string =>
  value === null || !Number.isFinite(value)
    ? '—'
    : `${(value * 100).toFixed(digits).replace('.', ',')}%`
