import type { Where } from 'payload'

import { normalizeEmail } from './email'
import { IN_WORKSHOP_STAGES, stageLabel, type OrderStage } from './orders'

/**
 * Customers in the panel (panel spec §6): one customer = one normalised e-mail across inquiries,
 * orders, units, tickets and accounts — no collection of its own. Pure: the panel loader reads
 * the records, these functions group them. Never used on the public site.
 */

/** Domain of the e-mail left in an anonymised order or unit (`.invalid` never delivers). */
export const ERASED_DOMAIN = 'usuniete.invalid'

/** E-mail left in an anonymised order or unit: required by the field, reaches no one. */
export const erasedEmail = (kind: 'order' | 'unit', id: number) =>
  `usuniete-${kind}-${id}@${ERASED_DOMAIN}`

/** An address left by „Usuń dane na żądanie” — not a client, never e-mailed. */
export const isErasedEmail = (email: string) => normalizeEmail(email).endsWith(`@${ERASED_DOMAIN}`)

/**
 * Mail in „Nieprzypisane” of one client: from exactly this address (stored trimmed and lower
 * case by the intake) or attached to one of their inquiries. Never a substring match — that would
 * take other people's mail (`kjan@x.pl` for `jan@x.pl`) into an export or an erasure.
 */
export function unmatchedWhere(email: string, inquiryIds: readonly number[]): Where {
  return {
    or: [
      { from: { equals: normalizeEmail(email) } },
      ...(inquiryIds.length ? [{ attachedTo: { in: [...inquiryIds] } }] : []),
    ],
  }
}

export type ClientInquiry = {
  id: number
  email: string
  name: string
  number: string | null
  createdAt: string
  lastActivityAt?: string | null
}

export type ClientOrder = {
  id: number
  email: string
  name: string
  number: string | null
  createdAt: string
  stage: OrderStage
  price: number | null
}

export type ClientAccount = { id: number; email: string; name: string; createdAt: string }

/** Where the client card opens: ids only — never an address in the URL (spec §1). */
export type ClientEntry =
  | { kind: 'konto'; id: number }
  | { kind: 'zapytanie'; id: number }
  | { kind: 'zamowienie'; id: number }

export type ClientRow = {
  email: string
  name: string
  lastContact: string
  inquiries: number
  orders: number
  spent: number
  entry: ClientEntry
}

/** An order counts as money spent once it is paid (`offer` = accepted, waiting for payment). */
export const isPaid = (order: Pick<ClientOrder, 'stage'>) => order.stage !== 'offer'

export function spentOf(orders: readonly { stage: OrderStage; price?: number | null }[]): number {
  return orders.reduce((sum, o) => sum + (isPaid(o) && o.price ? o.price : 0), 0)
}

const later = (a: string, b: string) => (Date.parse(a) >= Date.parse(b) ? a : b)
const newestFirst = <T extends { createdAt: string }>(rows: readonly T[]) =>
  [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

/**
 * „Klienci” list (spec §1): records grouped by e-mail, newest contact first. The name is the one
 * from the newest record; the card opens from the account, else the newest inquiry, else order.
 */
export function listClients(input: {
  inquiries: readonly ClientInquiry[]
  orders: readonly ClientOrder[]
  accounts: readonly ClientAccount[]
}): ClientRow[] {
  type Group = { inquiries: ClientInquiry[]; orders: ClientOrder[]; account: ClientAccount | null }
  const groups = new Map<string, Group>()
  const group = (email: string) => {
    const key = normalizeEmail(email)
    let g = groups.get(key)
    if (!g) {
      g = { inquiries: [], orders: [], account: null }
      groups.set(key, g)
    }
    return g
  }
  for (const i of input.inquiries) group(i.email).inquiries.push(i)
  for (const o of input.orders) group(o.email).orders.push(o)
  for (const a of input.accounts) group(a.email).account = a

  const rows: ClientRow[] = []
  for (const [email, g] of groups) {
    // Anonymised orders and units are history, not a client (decision 01.11, spec §6).
    if (isErasedEmail(email)) continue
    const inquiries = newestFirst(g.inquiries)
    const orders = newestFirst(g.orders)
    const named = [...inquiries, ...orders, ...(g.account ? [g.account] : [])]
    const newest = newestFirst(named)[0]
    if (!newest) continue
    const dates = [
      ...inquiries.map((i) =>
        i.lastActivityAt ? later(i.lastActivityAt, i.createdAt) : i.createdAt,
      ),
      ...orders.map((o) => o.createdAt),
      ...(g.account ? [g.account.createdAt] : []),
    ]
    const entry: ClientEntry = g.account
      ? { kind: 'konto', id: g.account.id }
      : inquiries[0]
        ? { kind: 'zapytanie', id: inquiries[0].id }
        : { kind: 'zamowienie', id: orders[0]!.id }
    rows.push({
      email,
      name: newest.name,
      lastContact: dates.reduce(later),
      inquiries: inquiries.length,
      orders: orders.length,
      spent: spentOf(orders),
      entry,
    })
  }
  return rows.sort((a, b) => Date.parse(b.lastContact) - Date.parse(a.lastContact))
}

export function parseEntry(params: {
  zapytanie?: string
  konto?: string
  zamowienie?: string
}): ClientEntry | null {
  const id = (value: string | undefined) => {
    const n = Number(value)
    return Number.isInteger(n) && n > 0 ? n : null
  }
  const konto = id(params.konto)
  if (konto) return { kind: 'konto', id: konto }
  const zapytanie = id(params.zapytanie)
  if (zapytanie) return { kind: 'zapytanie', id: zapytanie }
  const zamowienie = id(params.zamowienie)
  if (zamowienie) return { kind: 'zamowienie', id: zamowienie }
  return null
}

export const entryQuery = (entry: ClientEntry) => `?${entry.kind}=${entry.id}`

// ——— Client card (board Klient) ———

export type TimelineKind = 'inquiry' | 'reply' | 'offer' | 'order' | 'ticket' | 'unit'

export type TimelineEvent = {
  kind: TimelineKind
  at: string
  /** Bold part („Zapytanie PKG-2026-0041:”). */
  lead: string
  text: string
  /** Who did it („Krystian”, „serwis”) — optional. */
  by?: string | null
}

export type CardSource = {
  inquiries: readonly {
    number: string | null
    createdAt: string
    message?: string | null
  }[]
  messages: readonly {
    inquiryNumber: string | null
    at: string
    direction: 'in' | 'out' | 'note' | 'system'
    offer: boolean
    author?: string | null
  }[]
  orders: readonly {
    number: string | null
    buildName: string | null
    history: readonly { stage: OrderStage; at: string; by?: string | null }[]
  }[]
  tickets: readonly { createdAt: string; category: string }[]
  units: readonly { testedAt?: string | null; buildName: string | null; number?: number | null }[]
}

const quote = (text: string, max = 80) => {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > max ? `„${line.slice(0, max - 1)}…”` : `„${line}”`
}

/**
 * „Oś czasu” (board Klient): inquiries, sent replies and offers, every stage of every order,
 * tickets and tested units — newest first. Internal notes and customer replies stay in the thread.
 * TODO(krystian): the texts outside the board (reply, ticket, unit, stages other than „opłacone”).
 */
export function clientTimeline(
  source: CardSource,
  ticketLabel: (category: string) => string,
): TimelineEvent[] {
  const events: TimelineEvent[] = []
  for (const i of source.inquiries) {
    events.push({
      kind: 'inquiry',
      at: i.createdAt,
      lead: `Zapytanie ${i.number ?? ''}:`.replace(' :', ':'),
      text: i.message?.trim() ? quote(i.message) : 'bez wiadomości',
    })
  }
  for (const m of source.messages) {
    if (m.direction !== 'out') continue
    events.push({
      kind: m.offer ? 'offer' : 'reply',
      at: m.at,
      lead: m.offer ? 'Wysłano ofertę' : 'Wysłano odpowiedź',
      text: m.inquiryNumber ? `w zapytaniu ${m.inquiryNumber}` : '',
      by: m.author ?? null,
    })
  }
  for (const o of source.orders) {
    for (const h of o.history) {
      events.push({
        kind: 'order',
        at: h.at,
        lead: `Zamówienie ${o.number ?? ''}`.trim(),
        text: `${o.buildName ? `${o.buildName} · ` : ''}${stageLabel(h.stage).toLowerCase()}`,
        by: h.by ?? null,
      })
    }
  }
  for (const t of source.tickets) {
    events.push({
      kind: 'ticket',
      at: t.createdAt,
      lead: 'Zgłoszenie:',
      text: ticketLabel(t.category),
    })
  }
  for (const u of source.units) {
    if (!u.testedAt) continue
    events.push({
      kind: 'unit',
      at: u.testedAt,
      lead: 'Warsztat:',
      text: `${u.buildName ?? 'komputer'}${u.number ? `, egzemplarz nr ${u.number}` : ''} przetestowany`,
    })
  }
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

/**
 * Minutes from an inquiry to the first reply sent from the panel — for the newest inquiry that
 * has one („odpowiedź po 18 min”). `null` when nothing was answered yet.
 */
export function firstReplyMinutes(
  inquiries: readonly { number: string | null; createdAt: string }[],
  messages: CardSource['messages'],
): number | null {
  for (const inquiry of newestFirst(inquiries)) {
    const replies = messages
      .filter((m) => m.direction === 'out' && m.inquiryNumber === inquiry.number)
      .map((m) => Date.parse(m.at))
    if (replies.length === 0) continue
    return Math.max(0, Math.round((Math.min(...replies) - Date.parse(inquiry.createdAt)) / 60_000))
  }
  return null
}

/** „18 min”, „2 h 5 min”, „3 dni”. */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h} h ${m} min` : `${h} h`
  }
  const days = Math.round(minutes / (24 * 60))
  return days === 1 ? '1 dzień' : `${days} dni`
}

/** The order in the workshop now (paid, not shipped) — the newest if several. */
export function inWorkshop<T extends { stage: OrderStage; createdAt: string }>(
  orders: readonly T[],
): T | null {
  return newestFirst(orders.filter((o) => IN_WORKSHOP_STAGES.includes(o.stage)))[0] ?? null
}

/** „+48 5•• ••• •91” — the phone half hidden, as on the board (full number only on click). */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.length < 6) return '•••'
  const head = digits.startsWith('+') ? `${digits.slice(0, 3)} ${digits[3]}` : digits.slice(0, 1)
  return `${head}•• ••• •${digits.slice(-2)}`
}
