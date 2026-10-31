import 'server-only'

import type { Payload } from 'payload'

import type { Inquiry, User } from '../../payload-types'
import { percent, zl, marginStatus, type MarginStatus } from '../../lib/pricing/format'
import { costContext, evaluate } from '../../lib/pricing/cost'
import { loadBatch, loadOffer } from '../../lib/pricing/store'
import type { Config } from '../../lib/pricing/types'
import { DEFAULT_REPLY_HOURS, minutesInReplyHours, slaTone, waitLabel } from '../../lib/inquiry/sla'
import { renderTemplate } from '../../lib/inquiry/templates'
import { loadInquiryOffer } from '../../lib/inquiry/pricingStore'
import { loadReplyContext, topicOf } from '../../lib/inquiry/thread.server'
import { CHOICES, INQUIRY_TYPE_CHOICES, labelOf, type InquiryStatus } from '../../lib/inquiry/types'
import {
  INBOX_FILTERS,
  clock,
  initials,
  maskEmail,
  preview,
  sortInbox,
  statusesOf,
  whenLabel,
  type InboxFilter,
} from './format'

/**
 * Data of /admin/zapytania (panel spec §4) from one loader: the list with counts, and — when
 * `?nr=` names one — its thread, reply templates filled for it and the right column. Admin only
 * (the view checks first): the right column carries the margin and `{czesci}` internal models.
 */

const LIST_LIMIT = 200

export type InboxRow = {
  id: number
  number: string
  name: string
  initials: string
  when: string
  topic: string
  preview: string
  status: InquiryStatus
  typeLabel: string
  meta: { text: string; tone: 'warn' | 'bad' | 'mu' }
}

export type ThreadMessage = {
  id: string
  kind: 'in' | 'out' | 'note' | 'system'
  who: string | null
  when: string
  body: string
}

export type ReplyTemplateView = {
  id: number
  name: string
  kind: 'reply' | 'offer' | 'stage'
  text: string
  missing: string[]
}

export type AsideRow = { label: string; value: string; href?: string }

export type InboxThread = {
  id: number
  number: string
  topic: string
  typeLabel: string
  when: string
  status: InquiryStatus
  messages: ThreadMessage[]
  templates: ReplyTemplateView[]
  from: string
  toMasked: string
  /** Today's price differs from the one at the inquiry: the panel warns before an offer. */
  priceChanged: { at: string; today: string } | null
  client: { name: string; initials: string; prefers: string | null; rows: AsideRow[] }
  computer: {
    rows: AsideRow[]
    priceAt: string | null
    priceToday: string | null
    margin: { text: string; tone: MarginStatus } | null
  } | null
  extra: AsideRow[]
  order: { number: string } | null
  canConvert: boolean
}

export type InboxData = {
  filter: InboxFilter
  counts: Record<InboxFilter, number>
  rows: InboxRow[]
  thread: InboxThread | null
  /** `?nr=` named an inquiry that does not exist (deleted, mistyped). */
  missing: boolean
  /** No `?nr=`: the thread is the first of the list (the computer shows it, the phone the list). */
  auto: boolean
  replyHours: { from: number; to: number }
}

const KEYS = ['level', 'case', 'cooler', 'ram', 'ssd'] as const satisfies readonly (keyof Config)[]
const PART_LABEL: Record<keyof Config, string> = {
  level: 'Poziom',
  case: 'Obudowa',
  cooler: 'Chłodzenie',
  ram: 'Pamięć RAM',
  ssd: 'Dysk',
}

const nameOfUser = (author: number | User | null | undefined) =>
  typeof author === 'object' && author ? author.email.split('@')[0] || 'panel' : 'panel'

function metaOf(
  inquiry: Pick<Inquiry, 'status' | 'createdAt' | 'lastActivityAt'>,
  now: Date,
  hours: { from: number; to: number },
  slaMinutes: number,
): InboxRow['meta'] {
  switch (inquiry.status) {
    case 'new': {
      const waited = Math.floor((now.getTime() - Date.parse(inquiry.createdAt)) / 60_000)
      const inHours = minutesInReplyHours(inquiry.createdAt, now, hours)
      return { text: `czeka ${waitLabel(waited)}`, tone: slaTone(inHours, slaMinutes) }
    }
    case 'in_progress':
      return {
        text: inquiry.lastActivityAt ? `odpisano ${clock(inquiry.lastActivityAt)}` : 'w toku',
        tone: 'mu',
      }
    case 'offer_sent':
      return { text: 'oferta wysłana', tone: 'mu' }
    case 'won':
      return { text: 'zamówione', tone: 'mu' }
    default:
      return { text: 'zamknięte', tone: 'mu' }
  }
}

const fullConfig = (config: Inquiry['config']): Config | null => {
  const c = config ?? {}
  return c.level && c.case && c.cooler && c.ram && c.ssd
    ? { level: c.level, case: c.case, cooler: c.cooler, ram: c.ram, ssd: c.ssd }
    : null
}

export async function loadInbox(
  payload: Payload,
  user: User,
  { filter, nr, fromAddress }: { filter: InboxFilter; nr: string | null; fromAddress: string },
): Promise<InboxData> {
  const now = new Date()
  const statuses = statusesOf(filter)
  const [settings, list, ...counts] = await Promise.all([
    payload.findGlobal({ slug: 'mail-settings', depth: 0, overrideAccess: true }),
    payload.find({
      collection: 'inquiries',
      where: statuses ? { status: { in: statuses } } : {},
      select: {
        number: true,
        name: true,
        type: true,
        status: true,
        budget: true,
        voucher: true,
        build: true,
        message: true,
        createdAt: true,
        lastActivityAt: true,
      },
      populate: { builds: { name: true } },
      sort: '-createdAt',
      limit: LIST_LIMIT,
      depth: 1,
      overrideAccess: true,
    }),
    ...INBOX_FILTERS.map((f) =>
      payload.count({
        collection: 'inquiries',
        where: f.statuses ? { status: { in: f.statuses } } : {},
        overrideAccess: true,
      }),
    ),
  ])
  const hours = settings.replyHours ?? DEFAULT_REPLY_HOURS
  const rows = sortInbox(list.docs).map((doc): InboxRow => ({
    id: doc.id,
    number: doc.number ?? `#${doc.id}`,
    name: doc.name,
    initials: initials(doc.name),
    when: whenLabel(doc.createdAt, now),
    topic: topicOf(doc),
    preview: preview(doc.message),
    status: doc.status,
    typeLabel: labelOf(INQUIRY_TYPE_CHOICES, doc.type),
    meta: metaOf(doc, now, hours, settings.replySlaMinutes ?? 60),
  }))

  let thread: InboxThread | null = null
  let missing = false
  const target = nr ?? rows[0]?.number ?? null
  if (target) {
    const found = await payload.find({
      collection: 'inquiries',
      where: { number: { equals: target } },
      populate: { builds: { name: true, slug: true }, games: { name: true } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    })
    const inquiry = found.docs[0]
    if (inquiry) thread = await loadThread(payload, user, inquiry, now, fromAddress)
    else missing = nr !== null
  }

  return {
    filter,
    counts: Object.fromEntries(
      INBOX_FILTERS.map((f, i) => [f.value, counts[i]?.totalDocs ?? 0]),
    ) as Record<InboxFilter, number>,
    rows,
    thread,
    missing,
    auto: nr === null && thread !== null,
    replyHours: hours,
  }
}

async function loadThread(
  payload: Payload,
  user: User,
  inquiry: Inquiry,
  now: Date,
  fromAddress: string,
): Promise<InboxThread> {
  const config = fullConfig(inquiry.config)
  const [messages, templates, context, orders, offer, batch, pricing, labels] = await Promise.all([
    payload.find({
      collection: 'inquiry-messages',
      where: { inquiry: { equals: inquiry.id } },
      populate: { users: { email: true } },
      sort: 'at',
      pagination: false,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'reply-templates',
      where: { and: [{ active: { equals: true } }, { kind: { not_equals: 'stage' } }] },
      sort: 'order',
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
    loadReplyContext(payload, inquiry, user),
    payload.find({
      collection: 'orders',
      where: { inquiry: { equals: inquiry.id } },
      select: { number: true },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
    config ? loadOffer(payload) : null,
    config ? loadBatch(payload) : null,
    payload.findGlobal({
      slug: 'pricing-settings',
      select: { minMargin: true, warnMargin: true },
      depth: 0,
      overrideAccess: true,
    }),
    config ? loadInquiryOffer(payload).then((o) => o.labels) : null,
  ])

  // The customer's message from the form, then the confirmation (computed from the date — also
  // for inquiries older than P3, without a data migration), then the thread.
  const number = inquiry.number ?? `#${inquiry.id}`
  const timeline: ThreadMessage[] = [
    {
      id: 'form',
      kind: 'in',
      who: inquiry.name,
      when: whenLabel(inquiry.createdAt, now),
      // TODO(krystian): text when the form had no message — not on the board.
      body: inquiry.message?.trim() || 'Bez wiadomości — szczegóły w prawej kolumnie.',
    },
    {
      id: 'confirmation',
      kind: 'system',
      who: null,
      when: whenLabel(inquiry.createdAt, now),
      body: config
        ? `Wysłano automatyczne potwierdzenie z numerem ${number} i konfiguracją.`
        : `Wysłano automatyczne potwierdzenie z numerem ${number}.`,
    },
    ...messages.docs.map((m): ThreadMessage => ({
      id: String(m.id),
      kind: m.direction,
      who:
        m.direction === 'in'
          ? inquiry.name
          : m.direction === 'system'
            ? null
            : nameOfUser(m.author),
      when: whenLabel(m.at, now),
      body: m.attachmentsInfo ? `${m.body}\n\n${m.attachmentsInfo}` : m.body,
    })),
  ]

  // Margin at today's published price and today's costs (panel only, `lib/pricing`).
  let margin: { text: string; tone: MarginStatus } | null = null
  if (config && offer && batch) {
    const result = evaluate(config, costContext(offer.catalog, batch.snapshot))
    if (result) {
      margin = {
        text: percent(result.margin),
        tone: marginStatus(result.margin, pricing.minMargin, pricing.warnMargin),
      }
    }
  }
  // The configuration as the customer saw it: public names (spec §4), the code when unknown.
  const publicName = (key: keyof Config, code: string) =>
    (key === 'level' ? labels?.level[code] : labels?.option[code]) ?? code

  const priceAt = inquiry.priceAtInquiry ?? null
  const priceToday = context.priceToday
  const build = typeof inquiry.build === 'object' ? inquiry.build : null
  const games = (inquiry.games ?? [])
    .map((g) => (typeof g === 'object' && g ? g.name : null))
    .filter((g): g is string => Boolean(g))
  const otherGames = inquiry.otherGames?.trim()
  const monitor = [
    inquiry.monitor ? labelOf(CHOICES.monitor, inquiry.monitor) : null,
    inquiry.refresh ? labelOf(CHOICES.refresh, inquiry.refresh) : null,
  ]
    .filter(Boolean)
    .join(' ')
  // Entry page and UTM only (G12 `source`, no referrer).
  const source = [inquiry.source?.utmSource, pathOf(inquiry.source?.url)]
    .filter(Boolean)
    .join(' · ')
  const order = orders.docs[0]

  const rows = (pairs: (AsideRow | null | false | undefined | '' | 0)[]) =>
    pairs.filter((r): r is AsideRow => Boolean(r))

  return {
    id: inquiry.id,
    number,
    topic: topicOf(inquiry),
    typeLabel: labelOf(INQUIRY_TYPE_CHOICES, inquiry.type),
    when: whenLabel(inquiry.createdAt, now),
    status: inquiry.status,
    messages: timeline,
    templates: templates.docs.map((t) => {
      const { text, missing } = renderTemplate(t.body, context.values)
      return { id: t.id, name: t.name, kind: t.kind, text, missing }
    }),
    from: fromAddress,
    toMasked: maskEmail(inquiry.email),
    priceChanged:
      priceAt !== null && priceToday !== null && priceAt !== priceToday
        ? { at: zl(priceAt), today: zl(priceToday) }
        : null,
    client: {
      name: inquiry.name,
      initials: initials(inquiry.name),
      prefers: inquiry.preferredContact
        ? labelOf(CHOICES.preferredContact, inquiry.preferredContact)
        : null,
      rows: rows([
        { label: 'E-mail', value: inquiry.email },
        inquiry.phone && {
          label: 'Telefon',
          value: inquiry.phone,
          href: `tel:${inquiry.phone.replace(/[^\d+]/g, '')}`,
        },
        source && { label: 'Skąd', value: source },
        {
          label: 'Faktura',
          value: inquiry.invoice
            ? [labelOf(CHOICES.invoice, inquiry.invoice), inquiry.nip && `NIP ${inquiry.nip}`]
                .filter(Boolean)
                .join(', ')
            : 'nie',
        },
      ]),
    },
    computer: config
      ? {
          rows: KEYS.map((key) => ({
            label: PART_LABEL[key],
            value: publicName(key, config[key]),
          })),
          priceAt: priceAt === null ? null : zl(priceAt),
          priceToday: priceToday === null ? null : zl(priceToday),
          margin,
        }
      : null,
    extra: rows([
      build && { label: 'Zestaw', value: build.name },
      (games.length > 0 || otherGames) && {
        label: 'Gry',
        value: [...games, otherGames].filter(Boolean).join(', '),
      },
      monitor && { label: 'Monitor', value: monitor },
      inquiry.pickup && { label: 'Odbiór', value: labelOf(CHOICES.pickup, inquiry.pickup) },
      inquiry.customList && { label: 'Własna lista', value: inquiry.customList },
      inquiry.voucher?.amount && { label: 'Bon', value: zl(inquiry.voucher.amount) },
    ]),
    order: order?.number ? { number: order.number } : null,
    // Only an existing order hides it: a status set by hand to „Zamówienie” still allows it.
    canConvert: !order,
  }
}

/** Path of the entry page: „/zestawy/wampir” (the domain is always ours). */
function pathOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url, 'https://prokomgaming.pl').pathname
  } catch {
    return null
  }
}
