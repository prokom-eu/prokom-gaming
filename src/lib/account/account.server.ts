import 'server-only'

import type { CustomerSession } from '@/lib/account/session.server'
import { ticketCategoryLabel, ticketStatusLabel } from '@/lib/account/tickets'
import { plDate } from '@/lib/certificate'
import { decodeConfig } from '@/lib/configurator'
import { labelOf, LIGHT_COLOR_CHOICES } from '@/lib/inquiry/types'
import {
  CUSTOMER_STAGE_TEXT,
  isOrderStage,
  timeline,
  type OrderStage,
  type TimelineStep,
} from '@/lib/orders'

type Rel<T> = number | T | null | undefined
const obj = <T>(value: Rel<T>): T | null =>
  typeof value === 'object' && value !== null ? value : null
const idOf = (value: Rel<{ id: number }>): number | null =>
  typeof value === 'number' ? value : (obj(value)?.id ?? null)

export type AccountComputer = {
  orderNumber: string | null
  name: string
  slug: string
  key: string
  tierRoman: string | null
  photo: { src: string; alt: string } | null
  timeline: TimelineStep[]
  /** „Teraz: <b>…</b>” of the board. */
  now: string
  dueDate: string | null
  unit: {
    id: number
    number: number | null
    code: string | null
    published: boolean
    warrantyUntil: string | null
    parts: { label: string; warrantyUntil: string | null; serial: string | null }[]
  } | null
}

export type AccountTicket = {
  id: number
  createdAt: string | null
  category: string
  status: string
  unitLabel: string
}

export type AccountConfig = {
  id: string
  label: string
  href: string
  details: string
  photo: { src: string; alt: string } | null
}

export type AccountData = {
  name: string
  email: string
  phone: string
  consentAt: string | null
  computers: AccountComputer[]
  tickets: AccountTicket[]
  configs: AccountConfig[]
  /** Units the customer may file a report about (their own). */
  units: { id: number; label: string }[]
}

/**
 * Everything of `/konto` (spec. §15, board Konto), read **as the customer** (`overrideAccess:
 * false`, `user`): the access rules decide what is theirs (orders, units and tickets with their
 * own e-mail). Builds and options are public offer data.
 */
export async function loadAccount({ payload, customer }: CustomerSession): Promise<AccountData> {
  const asCustomer = { user: customer, overrideAccess: false, pagination: false } as const

  const [orders, units, tickets] = await Promise.all([
    payload.find({
      collection: 'orders',
      select: { number: true, stage: true, dueDate: true, build: true, unit: true },
      sort: '-createdAt',
      depth: 0,
      ...asCustomer,
    }),
    payload.find({
      collection: 'units',
      select: {
        number: true,
        code: true,
        published: true,
        warrantyUntil: true,
        parts: true,
        build: true,
      },
      sort: '-createdAt',
      depth: 0,
      ...asCustomer,
    }),
    payload.find({
      collection: 'tickets',
      select: { createdAt: true, category: true, status: true, unit: true },
      sort: '-createdAt',
      depth: 0,
      ...asCustomer,
    }),
  ])

  const savedConfigs = customer.savedConfigs ?? []
  const buildIds = new Set<number>()
  for (const o of orders.docs) {
    const id = idOf(o.build)
    if (id) buildIds.add(id)
  }
  for (const u of units.docs) {
    const id = idOf(u.build)
    if (id) buildIds.add(id)
  }
  const optionCodes = new Set<string>()
  for (const saved of savedConfigs) {
    const config = decodeConfig(saved.k)
    if (config) [config.case, config.ram, config.ssd].forEach((c) => optionCodes.add(c))
  }

  const [builds, options] = await Promise.all([
    buildIds.size
      ? payload.find({
          collection: 'builds',
          where: { id: { in: [...buildIds] } },
          select: { name: true, slug: true, creature: { key: true }, level: true, case: true },
          populate: {
            'power-levels': { tierRoman: true },
            options: { image: true, publicLabel: true },
            media: { url: true, filename: true, alt: true },
          },
          depth: 2,
          // Ids come only from the customer's own orders and units (read as the customer above),
          // so a build hidden later still shows its name in the account (P6). Narrow `select` and
          // `populate`: no cost or internal field.
          overrideAccess: true,
          pagination: false,
        })
      : null,
    optionCodes.size
      ? payload.find({
          collection: 'options',
          where: { code: { in: [...optionCodes] } },
          select: { code: true, publicLabel: true, image: true },
          populate: { media: { url: true, filename: true, alt: true } },
          depth: 1,
          overrideAccess: false,
          pagination: false,
        })
      : null,
  ])

  const photoOf = (media: unknown) => {
    const m = obj(media as Rel<{ url?: string | null; alt?: string | null }>)
    return m?.url ? { src: m.url, alt: m.alt ?? '' } : null
  }
  const buildById = new Map(
    (builds?.docs ?? []).map((b) => [
      b.id,
      {
        name: b.name,
        slug: b.slug,
        key: b.creature.key,
        tierRoman: obj(b.level)?.tierRoman ?? null,
        photo: photoOf(obj(b.case)?.image),
      },
    ]),
  )
  const optionByCode = new Map((options?.docs ?? []).map((o) => [o.code, o]))

  const unitById = new Map(units.docs.map((u) => [u.id, u]))
  const unitView = (id: number | null): AccountComputer['unit'] => {
    const u = id ? unitById.get(id) : undefined
    if (!u) return null
    return {
      id: u.id,
      number: u.number ?? null,
      code: u.code ?? null,
      published: u.published === true,
      warrantyUntil: plDate(u.warrantyUntil),
      parts: (u.parts ?? []).map((p) => ({
        label: p.label,
        warrantyUntil: plDate(p.warrantyUntil),
        serial: p.serial || null,
      })),
    }
  }

  const computers: AccountComputer[] = []
  const shownUnits = new Set<number>()
  for (const order of orders.docs) {
    const build = buildById.get(idOf(order.build) ?? -1)
    if (!build || !isOrderStage(order.stage)) continue
    const unitId = idOf(order.unit)
    if (unitId) shownUnits.add(unitId)
    computers.push({
      orderNumber: order.number ?? null,
      ...build,
      timeline: timeline(order.stage as OrderStage),
      now: CUSTOMER_STAGE_TEXT[order.stage as OrderStage],
      dueDate: order.stage === 'delivered' ? null : plDate(order.dueDate),
      unit: unitView(unitId),
    })
  }
  // A unit without an order in the system (e.g. bought in the shop) is still the customer's computer.
  for (const u of units.docs) {
    const build = buildById.get(idOf(u.build) ?? -1)
    if (shownUnits.has(u.id) || !build) continue
    computers.push({
      orderNumber: null,
      ...build,
      timeline: timeline('delivered'),
      now: CUSTOMER_STAGE_TEXT.delivered,
      dueDate: null,
      unit: unitView(u.id),
    })
  }

  const unitLabel = (id: number | null) => {
    const u = id ? unitById.get(id) : undefined
    const build = u ? buildById.get(idOf(u.build) ?? -1) : undefined
    if (!u || !build) return 'Komputer'
    return u.number ? `${build.name}, egzemplarz nr ${u.number}` : build.name
  }

  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone ?? '',
    consentAt: plDate(customer.consent?.acceptedAt),
    computers,
    tickets: tickets.docs.map((t) => ({
      id: t.id,
      createdAt: plDate(t.createdAt),
      category: ticketCategoryLabel(t.category),
      status: ticketStatusLabel(t.status),
      unitLabel: unitLabel(idOf(t.unit)),
    })),
    configs: savedConfigs.flatMap((saved) => {
      const config = decodeConfig(saved.k)
      if (!saved.id || !config) return []
      const caseOption = optionByCode.get(config.case)
      const params = new URLSearchParams({ k: saved.k })
      if (saved.light) params.set('swiatlo', saved.light)
      const light = saved.light ? labelOf(LIGHT_COLOR_CHOICES, saved.light) : null
      const savedAt = plDate(saved.savedAt)
      return [
        {
          id: saved.id,
          label: saved.label,
          href: `/konfigurator?${params.toString()}`,
          details: [
            light,
            optionByCode.get(config.ram)?.publicLabel,
            optionByCode.get(config.ssd)?.publicLabel,
            savedAt && `zapisana ${savedAt}`,
          ]
            .filter(Boolean)
            .join(', '),
          photo: photoOf(caseOption?.image) ?? null,
        },
      ]
    }),
    units: units.docs.flatMap((u) =>
      buildById.has(idOf(u.build) ?? -1) ? [{ id: u.id, label: unitLabel(u.id) }] : [],
    ),
  }
}
