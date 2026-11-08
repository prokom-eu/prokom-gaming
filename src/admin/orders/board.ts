import { dayKey } from '../dashboard/rules'
import { IN_WORKSHOP_STAGES, type OrderStage } from '../../lib/orders'

/**
 * Numbers of the workshop board (panel spec §7, board Zamowienia): the 4 tiles and „w etapie”.
 * Pure — the loader reads the orders. Sale prices only; costs and margins never reach this screen
 * (the `serwis` role sees it too).
 */

export type BoardOrder = {
  stage: OrderStage
  price: number | null
  dueDate: string | null
  stageChangedAt: string | null
  history: readonly { stage: OrderStage; at: string }[]
}

export type BoardTiles = {
  inWork: number
  dueThisWeek: number
  nearestDue: string | null
  /** Average working days from payment to shipping; `null` before the first shipped order. */
  avgDays: number | null
  value: number
  valueCount: number
}

/** On the board and not shipped: from the accepted offer to the certificate. */
const OPEN_STAGES: readonly OrderStage[] = ['offer', ...IN_WORKSHOP_STAGES]

/** Shipped orders taken into the average, newest first. */
const AVG_SAMPLE = 20

/** Working days (Mon–Fri) after `from` up to and including `to` — both Polish calendar days. */
export function workdaysBetween(from: string, to: string): number {
  const date = new Date(`${from}T12:00:00Z`)
  const end = new Date(`${to}T12:00:00Z`)
  let n = 0
  while (date < end) {
    date.setUTCDate(date.getUTCDate() + 1)
    const weekday = date.getUTCDay()
    if (weekday !== 0 && weekday !== 6) n++
  }
  return n
}

/** Monday and Sunday of the Polish week of `now`, as `YYYY-MM-DD`. */
export function weekOf(now: Date): { from: string; to: string } {
  const today = new Date(`${dayKey(now)}T12:00:00Z`)
  const back = (today.getUTCDay() + 6) % 7
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() - back)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) }
}

export function boardTiles(orders: readonly BoardOrder[], now: Date): BoardTiles {
  const open = orders.filter((o) => OPEN_STAGES.includes(o.stage))
  const week = weekOf(now)
  const dues = open
    .map((o) => (o.dueDate ? dayKey(o.dueDate) : null))
    .filter((d): d is string => d !== null)
    .sort()
  const thisWeek = dues.filter((d) => d >= week.from && d <= week.to)

  const spans: { shippedAt: string; days: number }[] = []
  for (const o of orders) {
    const paid = o.history.find((h) => h.stage === 'paid')
    const shipped = [...o.history].reverse().find((h) => h.stage === 'shipped')
    if (!paid || !shipped) continue
    spans.push({
      shippedAt: shipped.at,
      days: workdaysBetween(dayKey(paid.at), dayKey(shipped.at)),
    })
  }
  const sample = spans
    .sort((a, b) => Date.parse(b.shippedAt) - Date.parse(a.shippedAt))
    .slice(0, AVG_SAMPLE)

  return {
    inWork: orders.filter((o) => IN_WORKSHOP_STAGES.includes(o.stage)).length,
    dueThisWeek: thisWeek.length,
    // Overdue first: the nearest date still to ship, even from an earlier week.
    nearestDue: dues[0] ?? null,
    avgDays: sample.length
      ? Math.round(sample.reduce((s, x) => s + x.days, 0) / sample.length)
      : null,
    value: open.reduce((s, o) => s + (o.price ?? 0), 0),
    valueCount: open.length,
  }
}

/** „dziś”, „1 dzień”, „3 dni” — calendar days in the current stage. */
export function inStageLabel(stageChangedAt: string | null, now: Date): string | null {
  if (!stageChangedAt) return null
  const days = Math.round(
    (Date.parse(`${dayKey(now)}T12:00:00Z`) - Date.parse(`${dayKey(stageChangedAt)}T12:00:00Z`)) /
      86_400_000,
  )
  if (days <= 0) return 'dziś'
  return days === 1 ? '1 dzień' : `${days} dni`
}

/** „obietnica na stronie: 5–10” from „5–10 dni roboczych od wpłaty” (site settings). */
export function promiseLabel(fulfilment: string | null | undefined): string | null {
  const text = fulfilment?.trim()
  if (!text) return null
  const range = /\d+\s*[–-]\s*\d+/.exec(text)?.[0]
  return range ? range.replace(/\s*[–-]\s*/, '–') : text
}
