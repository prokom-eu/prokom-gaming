import 'server-only'

import type { Payload } from 'payload'

import { ticketCategoryLabel, ticketStatusLabel } from '../../lib/account/tickets'
import {
  clientTimeline,
  durationLabel,
  firstReplyMinutes,
  inWorkshop,
  isErasedEmail,
  listClients,
  spentOf,
  type ClientEntry,
  type ClientRow,
  type TimelineEvent,
} from '../../lib/clients'
import { normalizeEmail } from '../../lib/email'
import { topicOf } from '../../lib/inquiry/thread.server'
import { INVOICE_CHOICES, labelOf, MONITOR_CHOICES, PICKUP_CHOICES } from '../../lib/inquiry/types'
import { isOrderStage, stageLabel, type OrderStage } from '../../lib/orders'
import { STATUS_CHIP } from '../inquiries/format'

/**
 * Data of /admin/klienci and /admin/klient (panel spec §6). Admin only — the views check the role
 * before calling. Reads are trusted (`overrideAccess`) and group everything by the normalised
 * e-mail; the e-mail itself never leaves the server in an address.
 */

const trusted = { pagination: false, depth: 0, overrideAccess: true } as const
type Rel<T> = number | T | null | undefined
const obj = <T>(value: Rel<T>): T | null => (typeof value === 'object' && value ? value : null)
const userName = (author: Rel<{ email: string }>) => obj(author)?.email.split('@')[0] ?? null

/** „Klienci” — every e-mail with an inquiry, an order or an account. */
export async function loadClients(payload: Payload): Promise<ClientRow[]> {
  const [inquiries, orders, accounts] = await Promise.all([
    payload.find({
      collection: 'inquiries',
      select: { email: true, name: true, number: true, createdAt: true, lastActivityAt: true },
      ...trusted,
    }),
    payload.find({
      collection: 'orders',
      select: { email: true, name: true, number: true, createdAt: true, stage: true, price: true },
      ...trusted,
    }),
    payload.find({
      collection: 'customers',
      select: { email: true, name: true, createdAt: true },
      ...trusted,
    }),
  ])
  return listClients({
    inquiries: inquiries.docs.map((i) => ({
      id: i.id,
      email: i.email,
      name: i.name,
      number: i.number ?? null,
      createdAt: i.createdAt,
      lastActivityAt: i.lastActivityAt ?? null,
    })),
    orders: orders.docs.flatMap((o) =>
      isOrderStage(o.stage)
        ? [
            {
              id: o.id,
              email: o.email,
              name: o.name,
              number: o.number ?? null,
              createdAt: o.createdAt,
              stage: o.stage,
              price: o.price ?? null,
            },
          ]
        : [],
    ),
    accounts: accounts.docs.map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      createdAt: a.createdAt,
    })),
  })
}

/** The e-mail behind a card entry (`?zapytanie=`, `?konto=`, `?zamowienie=`), or `null`. */
export async function emailOf(payload: Payload, entry: ClientEntry): Promise<string | null> {
  const collection =
    entry.kind === 'konto' ? 'customers' : entry.kind === 'zapytanie' ? 'inquiries' : 'orders'
  const doc = await payload.findByID({
    collection,
    id: entry.id,
    select: { email: true },
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  const email = doc && 'email' in doc ? doc.email : null
  // An anonymised order or unit has no client any more (spec §6, erasure on request).
  if (typeof email !== 'string' || !email || isErasedEmail(email)) return null
  return normalizeEmail(email)
}

export type CardInquiry = {
  id: number
  number: string
  topic: string
  status: { label: string; tone: string }
  at: string
}
export type CardOrder = {
  id: number
  number: string
  build: string | null
  stage: string
  price: number | null
  at: string
}
export type CardUnit = {
  build: string | null
  number: number | null
  code: string
  published: boolean
  warrantyUntil: string | null
  parts: { label: string; model: string; serial: string | null }[]
}
export type CardTicket = {
  at: string
  category: string
  status: string
  description: string
}
export type CardNote = { at: string; author: string | null; body: string }

export type ClientCard = {
  email: string
  name: string
  since: string
  source: string | null
  preferredContact: 'email' | 'phone' | null
  phone: string | null
  pickup: string | null
  invoice: string | null
  paidOrders: number
  tiles: {
    spent: number
    orders: number
    inquiries: number
    firstReply: string | null
    workshop: { stage: string; build: string | null; due: string | null } | null
    warranty: { until: string; build: string | null; number: number | null } | null
  }
  timeline: TimelineEvent[]
  inquiries: CardInquiry[]
  orders: CardOrder[]
  units: CardUnit[]
  tickets: CardTicket[]
  consents: { at: string; version: string | null; what: string }[]
  hasOrders: boolean
  /** Notes go to the account (`customers.notes`), else into the newest inquiry's thread. */
  notes:
    | { target: 'account'; id: number; text: string }
    | { target: 'inquiry'; id: number; list: CardNote[] }
    | null
  fromInquiry: { games: string | null; monitor: string | null; source: string | null } | null
  /** Thread of the newest inquiry („Napisz”). */
  writeTo: string | null
}

const sourceOf = (
  source: { url?: string | null; utmSource?: string | null } | null | undefined,
) => {
  if (source?.utmSource?.trim()) return source.utmSource.trim()
  if (!source?.url) return null
  try {
    return new URL(source.url).pathname || null
  } catch {
    return null
  }
}

/** Everything under one e-mail for the card (board Klient). */
export async function loadClientCard(payload: Payload, email: string): Promise<ClientCard | null> {
  const where = { email: { equals: email } }
  const [inquiries, orders, units, tickets, customers] = await Promise.all([
    payload.find({
      collection: 'inquiries',
      where,
      sort: '-createdAt',
      ...trusted,
      depth: 1,
      populate: { builds: { name: true }, games: { name: true } },
    }),
    payload.find({
      collection: 'orders',
      where,
      sort: '-createdAt',
      ...trusted,
      depth: 1,
      populate: { builds: { name: true } },
    }),
    payload.find({
      collection: 'units',
      where,
      sort: '-createdAt',
      ...trusted,
      depth: 1,
      populate: { builds: { name: true } },
    }),
    payload.find({ collection: 'tickets', where, sort: '-createdAt', ...trusted }),
    payload.find({ collection: 'customers', where, limit: 1, ...trusted, pagination: true }),
  ])
  const account = customers.docs[0] ?? null
  const newest = inquiries.docs[0] ?? null
  if (!newest && orders.docs.length === 0 && !account && units.docs.length === 0) return null

  const ids = inquiries.docs.map((i) => i.id)
  const messages = ids.length
    ? await payload.find({
        collection: 'inquiry-messages',
        where: { inquiry: { in: ids } },
        sort: 'at',
        ...trusted,
        depth: 1,
        populate: { users: { email: true }, 'reply-templates': { kind: true } },
      })
    : { docs: [] }
  const numberOf = new Map(inquiries.docs.map((i) => [i.id, i.number ?? null]))
  const msgs = messages.docs.map((m) => ({
    inquiryId: typeof m.inquiry === 'object' ? m.inquiry.id : m.inquiry,
    inquiryNumber: numberOf.get(typeof m.inquiry === 'object' ? m.inquiry.id : m.inquiry) ?? null,
    at: m.at,
    direction: m.direction,
    offer: obj(m.template)?.kind === 'offer',
    author: userName(m.author),
    body: m.body,
  }))

  const ord = orders.docs.flatMap((o) => (isOrderStage(o.stage) ? [{ ...o, stage: o.stage }] : []))
  const buildName = (b: Rel<{ name: string }>) => obj(b)?.name ?? null
  const dates = [
    ...inquiries.docs.map((i) => i.createdAt),
    ...ord.map((o) => o.createdAt),
    ...(account ? [account.createdAt] : []),
  ].sort()
  const names = [
    ...inquiries.docs.map((i) => ({ at: i.createdAt, name: i.name })),
    ...ord.map((o) => ({ at: o.createdAt, name: o.name })),
    ...(account ? [{ at: account.createdAt, name: account.name }] : []),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

  const now = inWorkshop(ord)
  const warrantyUnit = units.docs.find((u) => u.warrantyUntil) ?? null
  const paid = ord.filter((o) => o.stage !== 'offer')

  const consents = [
    ...inquiries.docs.flatMap((i) =>
      i.consent?.accepted
        ? [
            {
              at: i.consent.acceptedAt ?? i.createdAt,
              version: i.consent.clauseVersion ?? null,
              what: `Klauzula informacyjna — zapytanie ${i.number ?? ''}`.trim(),
            },
          ]
        : [],
    ),
    ...(account?.consent?.acceptedAt
      ? [
          {
            at: account.consent.acceptedAt,
            version: account.consent.clauseVersion ?? null,
            what: 'Konto klienta na stronie',
          },
        ]
      : []),
  ]

  const notes: ClientCard['notes'] = account
    ? { target: 'account', id: account.id, text: account.notes ?? '' }
    : newest
      ? {
          target: 'inquiry',
          id: newest.id,
          list: msgs
            .filter((m) => m.direction === 'note' && m.inquiryId === newest.id)
            .map((m) => ({ at: m.at, author: m.author, body: m.body })),
        }
      : null

  return {
    email,
    name: names[0]?.name ?? email,
    since: dates[0] ?? new Date().toISOString(),
    source: sourceOf(newest?.source),
    preferredContact: newest?.preferredContact ?? null,
    phone: newest?.phone?.trim() || account?.phone?.trim() || null,
    pickup: newest?.pickup ? labelOf(PICKUP_CHOICES, newest.pickup) : null,
    invoice: newest?.invoice
      ? `${labelOf(INVOICE_CHOICES, newest.invoice)}${newest.nip ? `, NIP ${newest.nip}` : ''}`
      : null,
    paidOrders: paid.length,
    tiles: {
      spent: spentOf(ord),
      orders: paid.length,
      inquiries: inquiries.docs.length,
      firstReply: (() => {
        const m = firstReplyMinutes(
          inquiries.docs.map((i) => ({ number: i.number ?? null, createdAt: i.createdAt })),
          msgs,
        )
        return m === null ? null : durationLabel(m)
      })(),
      workshop: now
        ? { stage: stageLabel(now.stage), build: buildName(now.build), due: now.dueDate ?? null }
        : null,
      warranty: warrantyUnit?.warrantyUntil
        ? {
            until: warrantyUnit.warrantyUntil,
            build: buildName(warrantyUnit.build),
            number: warrantyUnit.number ?? null,
          }
        : null,
    },
    timeline: clientTimeline(
      {
        inquiries: inquiries.docs.map((i) => ({
          number: i.number ?? null,
          createdAt: i.createdAt,
          message: i.message ?? null,
        })),
        messages: msgs,
        orders: ord.map((o) => ({
          number: o.number ?? null,
          buildName: buildName(o.build),
          history: (o.stageHistory ?? []).flatMap((h) =>
            isOrderStage(h.stage)
              ? [{ stage: h.stage as OrderStage, at: h.at, by: userName(h.by) }]
              : [],
          ),
        })),
        tickets: tickets.docs.map((t) => ({ createdAt: t.createdAt, category: t.category })),
        units: units.docs.map((u) => ({
          testedAt: u.testedAt ?? null,
          buildName: buildName(u.build),
          number: u.number ?? null,
        })),
      },
      ticketCategoryLabel,
    ),
    inquiries: inquiries.docs.map((i) => ({
      id: i.id,
      number: i.number ?? `#${i.id}`,
      topic: topicOf(i),
      status: STATUS_CHIP[i.status],
      at: i.createdAt,
    })),
    orders: ord.map((o) => ({
      id: o.id,
      number: o.number ?? `#${o.id}`,
      build: buildName(o.build),
      stage: stageLabel(o.stage),
      price: o.price ?? null,
      at: o.createdAt,
    })),
    units: units.docs.map((u) => ({
      build: buildName(u.build),
      number: u.number ?? null,
      code: u.code ?? '',
      published: Boolean(u.published),
      warrantyUntil: u.warrantyUntil ?? null,
      parts: (u.parts ?? []).map((p) => ({
        label: p.label ?? p.role,
        model: [p.manufacturer, p.model].filter(Boolean).join(' '),
        serial: p.serial ?? null,
      })),
    })),
    tickets: tickets.docs.map((t) => ({
      at: t.createdAt,
      category: ticketCategoryLabel(t.category),
      status: ticketStatusLabel(t.status),
      description: t.description,
    })),
    consents,
    hasOrders: ord.length > 0,
    notes,
    fromInquiry: newest
      ? {
          games:
            (newest.games ?? [])
              .map((g) => obj(g)?.name)
              .filter(Boolean)
              .join(', ') || null,
          monitor: newest.monitor ? labelOf(MONITOR_CHOICES, newest.monitor) : null,
          source: sourceOf(newest.source),
        }
      : null,
    writeTo: newest?.number ?? null,
  }
}
