import { minutesInReplyHours, waitLabel, type ReplyHours } from '../../lib/inquiry/sla'
import { ORDER_STAGE_CHOICES, type OrderStage } from '../../lib/orders'
import { plural } from '../../lib/pl'
import { percentShort as percent } from '../../lib/pricing/format'
import type { IconName } from '../ui/icons'

/**
 * „Czeka na Ciebie” on the Pulpit (panel spec §3.3): what to do now, the most urgent first, each
 * with a button to the place where it gets done. Pure — the loader passes counts and dates.
 * Rules of the price report (unavailable parts, unread report) come with P7.
 */

export type TodoKind = 'inquiries' | 'queue' | 'order'

export type TodoItem = {
  kind: TodoKind
  key: string
  /** Red, counted in „N pilne”. */
  urgent: boolean
  icon: IconName
  title: string
  note: string
  action: { label: string; path: string }
}

export type WaitingInquiry = { name: string; createdAt: string }

export type DueOrder = {
  id: number
  number: string
  buildName: string | null
  stage: OrderStage
  dueDate: string
  checklistDone: number
  checklistTotal: number
}

export type TodoInput = {
  /** `new` inquiries, any order. */
  waiting: readonly WaitingInquiry[]
  replyHours: ReplyHours
  slaMinutes: number
  /** `null` without a price batch or when the offer cannot be read. */
  queue: {
    count: number
    /** Lowest configurator margin with the prices on the site and today's costs. */
    lowestNow: number | null
    /** Lowest margin after approving the queue. */
    lowestAfter: number | null
    minMargin: number
  } | null
  /** Active orders with a due date (the rule picks the ones due soon). */
  orders: readonly DueOrder[]
}

/** Orders due within this many working days count (spec §3.3). */
export const DUE_WORKDAYS = 2

/** Stages that still need work before shipping (spec §3.3: „nie są w etapie Wysłane”). */
const OPEN_STAGES: readonly OrderStage[] = [
  'offer',
  'paid',
  'parts',
  'assembly',
  'test',
  'metric_ready',
]

// TODO(krystian): what to do in each stage — not on the board (only „dokończyć testy”).
const STAGE_TODO: Record<OrderStage, string> = {
  offer: 'czeka na wpłatę',
  paid: 'zamówić części',
  parts: 'skompletować części',
  assembly: 'dokończyć montaż',
  test: 'dokończyć testy',
  metric_ready: 'przygotować wysyłkę',
  shipped: 'wysłane',
  delivered: 'u klienta',
}

const warsawDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const dayMonth = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: 'numeric',
  month: 'numeric',
})

/** Polish calendar day of an instant: „2026-11-02”. */
export const dayKey = (date: Date | string) => warsawDay.format(new Date(date))

/**
 * The day `n` working days after `day` (Mon–Fri; a weekend day itself is not counted).
 * TODO(krystian): public holidays (1.11, 11.11, Christmas) — today only weekends.
 */
export function addWorkdays(day: string, n: number): string {
  const date = new Date(`${day}T12:00:00Z`)
  let left = n
  while (left > 0) {
    date.setUTCDate(date.getUTCDate() + 1)
    const weekday = date.getUTCDay()
    if (weekday !== 0 && weekday !== 6) left--
  }
  return date.toISOString().slice(0, 10)
}

/** „4.11” — the due date as on the board. */
const shortDate = (iso: string) => dayMonth.format(new Date(iso))

/** „Michał Wiśniewski” → „Michał W.” — the name as the board shows it. */
export function shortName(name: string): string {
  const [first = '', second] = name.trim().split(/\s+/)
  return second ? `${first} ${second[0]!.toUpperCase()}.` : first
}

/** „odpowiedź w godzinę” for 60 min, else „odpowiedź w 90 min”. */
const promise = (minutes: number) =>
  minutes === 60 ? 'odpowiedź w godzinę' : `odpowiedź w ${waitLabel(minutes)}`

function inquiriesItem(input: TodoInput, now: Date): TodoItem | null {
  if (input.waiting.length === 0) return null
  const oldestFirst = [...input.waiting].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  )
  const urgent = oldestFirst.some(
    (i) => minutesInReplyHours(i.createdAt, now, input.replyHours) >= input.slaMinutes,
  )
  const n = oldestFirst.length
  const waited = (i: WaitingInquiry) =>
    waitLabel(Math.floor((now.getTime() - Date.parse(i.createdAt)) / 60_000))
  // Up to three names; the first one says what was promised (board: „Anna K. czeka 1 h 21 min
  // (obietnica: odpowiedź w godzinę) · Michał W. 34 min”).
  const names = oldestFirst
    .slice(0, 3)
    .map((i, index) =>
      index === 0
        ? `${shortName(i.name)} czeka ${waited(i)} (obietnica: ${promise(input.slaMinutes)})`
        : `${shortName(i.name)} ${waited(i)}`,
    )
  if (n > 3) names.push(`i ${n - 3} ${plural(n - 3, ['inne', 'inne', 'innych'])}`)
  return {
    kind: 'inquiries',
    key: 'inquiries',
    urgent,
    icon: 'mail',
    title: `${n} ${plural(n, ['nowe zapytanie', 'nowe zapytania', 'nowych zapytań'])} bez odpowiedzi`,
    note: names.join(' · '),
    action: { label: 'Odpowiedz', path: '/zapytania?filtr=nowe' },
  }
}

function queueItem(input: TodoInput): TodoItem | null {
  const q = input.queue
  if (!q || q.count === 0) return null
  const urgent = q.lowestNow !== null && q.lowestNow < q.minMargin
  const prices = `${q.count} ${plural(q.count, ['cena', 'ceny', 'cen'])} do zatwierdzenia`
  // TODO(krystian): the board starts the note with the cause from the price report („RAM DDR5
  // +8% po porannym sprawdzeniu”) — that comes with P7; the rest is ours.
  const note = urgent
    ? q.lowestAfter !== null && q.lowestAfter >= q.minMargin
      ? 'Zatwierdzenie przywraca minimum.'
      : q.lowestAfter === null
        ? 'Nie da się policzyć marży po zatwierdzeniu — sprawdź koszty i ceny.'
        : `Po zatwierdzeniu najniższa marża ${percent(q.lowestAfter)} — popraw dane albo narzut.`
    : `Najniższa marża w konfiguratorze ${percent(q.lowestNow)}, minimum ${percent(q.minMargin)}.`
  return {
    kind: 'queue',
    key: 'queue',
    urgent,
    icon: urgent ? 'alert' : 'check',
    title: urgent ? `${prices} · marża w konfiguratorze ${percent(q.lowestNow)}` : prices,
    note,
    action: { label: 'Zatwierdź', path: '/ceny' },
  }
}

function orderItems(input: TodoInput, now: Date): TodoItem[] {
  const limit = addWorkdays(dayKey(now), DUE_WORKDAYS)
  return input.orders
    .filter((o) => OPEN_STAGES.includes(o.stage) && dayKey(o.dueDate) <= limit)
    .sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate) || a.id - b.id)
    .map((o): TodoItem => {
      const who = o.buildName ? `${o.buildName} (${o.number})` : o.number
      const checklist =
        o.checklistTotal > 0
          ? `${o.checklistDone} z ${o.checklistTotal} ${plural(o.checklistTotal, ['punktu', 'punktów', 'punktów'])} listy kontrolnej · `
          : `${stageLabel(o.stage)} · `
      return {
        kind: 'order',
        key: `order:${o.id}`,
        // TODO(krystian): an order past its due date as urgent (red)? The spec only says „due
        // within 2 working days”.
        urgent: false,
        icon: 'wrench',
        title: `${who}: ${STAGE_TODO[o.stage]}`,
        note: `${checklist}termin wysyłki ${shortDate(o.dueDate)}`,
        // TODO(P5): the workshop board `/zamowienia` — until then the order in the Payload list.
        action: { label: 'Warsztat', path: `/collections/orders/${o.id}` },
      }
    })
}

const stageLabel = (stage: OrderStage) =>
  ORDER_STAGE_CHOICES.find((c) => c.value === stage)?.label ?? stage

/** The whole list: urgent first, then inquiries, the queue and orders by due date. */
export function todoList(input: TodoInput, now: Date): TodoItem[] {
  const items = [inquiriesItem(input, now), queueItem(input), ...orderItems(input, now)].filter(
    (i): i is TodoItem => i !== null,
  )
  // Stable sort: the order above stays within the urgent and the rest.
  return items.sort((a, b) => Number(b.urgent) - Number(a.urgent))
}
