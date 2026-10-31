import type { InquiryStatus } from '../../lib/inquiry/types'

/**
 * Pure helpers of the inquiry inbox (panel spec §4): filters, order of the list, time labels,
 * initials and the half-hidden address. Browser-safe; no personal data leaves the page.
 */

export const INBOX_FILTERS = [
  { value: 'wszystkie', label: 'Wszystkie', statuses: null },
  { value: 'nowe', label: 'Nowe', statuses: ['new'] },
  { value: 'w-toku', label: 'W toku', statuses: ['in_progress', 'offer_sent'] },
  { value: 'zamkniete', label: 'Zamknięte', statuses: ['won', 'lost', 'closed'] },
] as const satisfies readonly {
  value: string
  label: string
  statuses: readonly InquiryStatus[] | null
}[]
export type InboxFilter = (typeof INBOX_FILTERS)[number]['value']

/** Filter from the address; anything unknown = all. */
export function parseFilter(value: unknown): InboxFilter {
  return INBOX_FILTERS.find((f) => f.value === value)?.value ?? 'wszystkie'
}

export function statusesOf(filter: InboxFilter): readonly InquiryStatus[] | null {
  return INBOX_FILTERS.find((f) => f.value === filter)?.statuses ?? null
}

/** Status switch in the thread header (board: Nowe · W toku · Oferta · Zamówienie). */
export const STATUS_SWITCH = [
  { value: 'new', label: 'Nowe' },
  { value: 'in_progress', label: 'W toku' },
  { value: 'offer_sent', label: 'Oferta' },
  { value: 'won', label: 'Zamówienie' },
] as const satisfies readonly { value: InquiryStatus; label: string }[]

/** Chip of a status on the list: colour and text (panel spec §2 „Statusy”). */
export const STATUS_CHIP: Record<
  InquiryStatus,
  { label: string; tone: 'gold' | 'info' | 'mu' | 'ok' }
> = {
  new: { label: 'Nowe', tone: 'gold' },
  in_progress: { label: 'W toku', tone: 'info' },
  offer_sent: { label: 'Oferta wysłana', tone: 'mu' },
  won: { label: 'Zamówienie', tone: 'ok' },
  lost: { label: 'Bez zakupu', tone: 'mu' },
  closed: { label: 'Zamknięte', tone: 'mu' },
}

type Sortable = { status: InquiryStatus; createdAt: string; lastActivityAt?: string | null }

/**
 * Order of the list (spec §4): new ones first, the longest waiting on top; then the rest by the
 * latest activity. Stable for equal times.
 */
export function sortInbox<T extends Sortable>(rows: readonly T[]): T[] {
  const activity = (r: T) => Date.parse(r.lastActivityAt ?? r.createdAt)
  return [...rows].sort((a, b) => {
    const aNew = a.status === 'new'
    const bNew = b.status === 'new'
    if (aNew !== bNew) return aNew ? -1 : 1
    if (aNew) return Date.parse(a.createdAt) - Date.parse(b.createdAt)
    return activity(b) - activity(a)
  })
}

const dayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const hm = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  hour: '2-digit',
  minute: '2-digit',
})
const dm = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
})

/** „dziś 19:42”, „wczoraj 21:03”, „28.10, 20:15” — Polish time. */
export function whenLabel(iso: string, now: Date): string {
  const date = new Date(iso)
  const time = hm.format(date)
  const day = dayKey.format(date)
  if (day === dayKey.format(now)) return `dziś ${time}`
  if (day === dayKey.format(new Date(now.getTime() - 86_400_000))) return `wczoraj ${time}`
  return `${dm.format(date)}, ${time}`
}

/** Just the clock: „14:38”. */
export const clock = (iso: string) => hm.format(new Date(iso))

/** „Michał W.” → „MW”, „anna” → „A”. */
export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

/** „michal.wisniewski@gmail.com” → „michal.w…@gmail.com” (spec §4: half hidden under the reply). */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@')
  if (!domain) return '…'
  return local.length <= 8 ? `${local}@${domain}` : `${local.slice(0, 8)}…@${domain}`
}

/** First line of the message for the list. */
export function preview(text: string | null | undefined, max = 90): string {
  const line = (text ?? '').replace(/\s+/g, ' ').trim()
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}
