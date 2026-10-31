import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { randomUUID } from 'node:crypto'

import type { Inquiry } from '../../payload-types'
import type { CompatError } from '../compat'
import { errorFields, type LogFields } from '../logger'
import type { PriceSnapshot } from '../pricing/snapshot'
import type { Config } from '../pricing/types'
import { isReserved, locationOf, RESERVATION_MS, SKIP_STOCK_GUARD, stockPrice } from '../stock'
import {
  confirmationEmail,
  notificationEmail,
  type ComputerForEmail,
  type Email,
  type InquiryForEmail,
  type StockForEmail,
} from './emails'
import { priceComputer, type InquiryOffer, type PricedComputer } from './price'
import { newMessageId } from './replyMail'
import { inquiryPanelPath } from './subject'
import { inquiryFieldErrors, parseInquiryInput } from './schema'
import {
  checkFormToken,
  createRateLimiter,
  FORM_TOKEN_FIELD,
  HONEYPOT_FIELD,
  isHoneypotFilled,
  rateLimitKey,
} from './spam'
import { CONFIG_TYPES, type InquiryType } from './types'

export type SubmitResult =
  | { ok: true; id: number; number: string }
  | { ok: false; error: 'spam' | 'rate_limited' | 'unavailable' }
  | { ok: false; error: 'invalid'; fields: string[]; compat?: CompatError[] }

type NewInquiry = Omit<Inquiry, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'statusChangedAt'>

/** The offer and the newest published prices, with public names for the e-mails. */
export type Pricing = {
  offer: InquiryOffer
  snapshot: PriceSnapshot
  labels: { level: Record<string, string>; option: Record<string, string> }
}

/** A „Gotowe od ręki” unit as the inquiry needs it: what to price and whether it is free. */
export type StockUnit = {
  id: number
  buildSlug: string
  /** Codes changed against the build's recipe (empty = the recipe). */
  changes: Partial<Config>
  discount: number
  active: boolean
  reservedUntil: string | null
  location: string
  conditionNote: string
  /** The panel's margin guard still accepts it at today's prices and costs (ADR-G002 §7). */
  marginOk: boolean
}

/** Everything `submitInquiry` touches outside itself — injected, so the logic is unit-tested. */
export type SubmitDeps = {
  secret: string
  now: () => number
  limiter: { hit: (key: string) => boolean }
  /** `null` when no price batch is published yet (a new database). */
  loadPricing: () => Promise<Pricing | null>
  findGames: (slugs: string[]) => Promise<{ id: number; slug: string; name: string }[]>
  /** `null` = no such unit (or not readable). */
  loadStock: (id: number) => Promise<StockUnit | null>
  /** Claims the unit until `until` unless it is reserved at `now`; `false` = someone was first. */
  reserveStock: (id: number, until: string, now: string) => Promise<boolean>
  /** Gives the unit back when the inquiry could not be saved. */
  releaseStock: (id: number) => Promise<void>
  /** Returns the record after the hooks, so with its number. */
  save: (data: NewInquiry) => Promise<{ id: number; number?: string | null }>
  sendEmail: (email: Email) => Promise<unknown>
  /** A fresh `Message-ID` for the confirmation (`<uuid@sender-domain>`). */
  newMessageId: () => string
  /** Keeps the confirmation's id, so the customer's answer to it lands in the thread (P3/P4). */
  saveConfirmationId: (id: number, messageId: string) => Promise<void>
  /**
   * Runs the e-mails: after the response in the app (`after()` from `next/server` — the customer
   * does not wait for SMTP), awaited in tests. The record is saved before either way.
   */
  defer: (task: () => Promise<void>) => void | Promise<void>
  /** Gaming inbox (`INQUIRY_NOTIFY_EMAIL`); `null` locally without it. */
  notifyTo: string | null
  /** „Odpowiedź na zapytanie” from `site-settings`; `null` when empty or unreadable. */
  responseTime: () => Promise<string | null>
  /** Link in the notification: the inquiry in the panel's inbox, by number (P3). */
  panelUrl: (id: number, number: string) => string
  // Structured fields only: ids, codes, `errorFields()` of a caught error — never form data
  // (ADR-G005); database errors quote query parameters, SMTP errors the recipients.
  log: Record<'info' | 'warn' | 'error', (fields: LogFields, msg: string) => void>
}

export type SubmitRequest = {
  /** Client IP set by the reverse proxy; `null` locally (one shared limit). */
  ip: string | null
  body: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const carriesComputer = (type: InquiryType) => (CONFIG_TYPES as readonly string[]).includes(type)

function computerForEmail(
  priced: PricedComputer,
  pricing: Pricing,
  unit: StockUnit | null,
): ComputerForEmail {
  const { level, option } = pricing.labels
  const config: Config = priced.config
  return {
    buildName: priced.build?.name ?? null,
    config,
    labels: {
      level: level[config.level],
      case: option[config.case],
      cooler: option[config.cooler],
      ram: option[config.ram],
      ssd: option[config.ssd],
    },
    price: priced.price,
    publishedAt: pricing.snapshot.publishedAt,
    ...(unit ? { unit: { discount: unit.discount } } : {}),
  }
}

/** The one place that accepts an inquiry (ADR-G005); see `submitInquiry`. */
export async function submitInquiryWith(
  deps: SubmitDeps,
  { ip, body }: SubmitRequest,
): Promise<SubmitResult> {
  if (!isRecord(body)) return { ok: false, error: 'invalid', fields: [] }

  const now = deps.now()
  if (
    isHoneypotFilled(body[HONEYPOT_FIELD]) ||
    checkFormToken(body[FORM_TOKEN_FIELD], deps.secret, now) !== 'ok'
  ) {
    deps.log.info({}, 'Inquiry rejected as spam')
    return { ok: false, error: 'spam' }
  }

  // Validation first: invalid attempts save nothing, so they do not use up the limit of a person
  // correcting the form; the limit guards what costs — records and e-mails.
  const parsed = parseInquiryInput(body)
  if (!parsed.success) {
    return { ok: false, error: 'invalid', fields: inquiryFieldErrors(parsed.error) }
  }
  const input = parsed.data

  // The computer is priced and checked here, from published prices — never taken as sent.
  let pricing: Pricing | null = null
  let priced: PricedComputer | null = null
  let unit: StockUnit | null = null
  if (carriesComputer(input.type) || input.type === 'ready') {
    try {
      pricing = await deps.loadPricing()
    } catch (error) {
      deps.log.error(errorFields(error), 'Inquiry pricing lookup failed')
      return { ok: false, error: 'unavailable' }
    }
    if (!pricing) {
      deps.log.error({}, 'Inquiry with a computer, but no prices are published')
      return { ok: false, error: 'unavailable' }
    }
    if (input.type === 'ready') {
      // „Gotowe od ręki”: the unit's configuration, priced like any computer, minus its discount.
      try {
        unit = input.stock === undefined ? null : await deps.loadStock(input.stock)
      } catch (error) {
        deps.log.error(errorFields(error), 'Inquiry stock lookup failed')
        return { ok: false, error: 'unavailable' }
      }
      if (!unit || !unit.active || !unit.marginOk || isReserved(unit.reservedUntil, now)) {
        deps.log.info({ stock: input.stock }, 'Inquiry for a unit that is gone or reserved')
        return { ok: false, error: 'invalid', fields: ['stock'] }
      }
      const result = priceComputer(
        { build: unit.buildSlug, config: unit.changes },
        pricing.offer,
        pricing.snapshot,
      )
      const price = result.ok ? stockPrice(result.price, unit.discount) : null
      if (!result.ok || price === null) {
        deps.log.error({ stock: unit.id }, 'Stock unit cannot be priced')
        return { ok: false, error: 'invalid', fields: ['stock'] }
      }
      priced = { ...result, price }
    }
    const result = priced ? null : priceComputer(input, pricing.offer, pricing.snapshot)
    if (result && !result.ok) {
      // Codes only: which rule the configuration broke, for the site to explain (G12).
      deps.log.info({ fields: result.fields, compat: result.compat }, 'Inquiry computer rejected')
      return { ok: false, error: 'invalid', fields: result.fields, compat: result.compat }
    }
    if (result) priced = result
  }

  // Unknown or removed games are dropped, like a stale list: not the customer's fault.
  let games: { id: number; name: string }[] = []
  if (input.games.length > 0) {
    try {
      const found = new Map((await deps.findGames(input.games)).map((g) => [g.slug, g]))
      games = input.games.flatMap((slug) => {
        const game = found.get(slug)
        return game ? [{ id: game.id, name: game.name }] : []
      })
    } catch (error) {
      deps.log.error(errorFields(error), 'Inquiry games lookup failed')
      return { ok: false, error: 'unavailable' }
    }
  }

  if (!deps.limiter.hit(rateLimitKey(ip ?? 'unknown', deps.secret))) {
    deps.log.warn({}, 'Inquiry rate-limited')
    return { ok: false, error: 'rate_limited' }
  }
  const acceptedAt = new Date(now).toISOString()

  // The unit is claimed before the record is saved: of two people at the same moment, one wins.
  const reservedUntil = new Date(now + RESERVATION_MS).toISOString()
  if (unit) {
    let claimed: boolean
    try {
      claimed = await deps.reserveStock(unit.id, reservedUntil, acceptedAt)
    } catch (error) {
      deps.log.error(errorFields(error), 'Stock reservation failed')
      return { ok: false, error: 'unavailable' }
    }
    if (!claimed) {
      deps.log.info({ stock: unit.id }, 'Stock unit reserved by someone else')
      return { ok: false, error: 'invalid', fields: ['stock'] }
    }
  }

  let saved: { id: number; number?: string | null }
  try {
    saved = await deps.save({
      type: input.type,
      status: 'new',
      build: priced?.build?.id ?? null,
      config: priced?.config ?? {},
      priceAtInquiry: priced?.price ?? null,
      priceBatch: priced?.batch ?? null,
      lightColor: input.lightColor,
      forWhom: input.forWhom,
      budget: input.budget,
      customList: input.customList,
      games: games.map((g) => g.id),
      otherGames: input.otherGames,
      monitor: input.monitor,
      refresh: input.refresh,
      caseColor: input.caseColor,
      lighting: input.lighting,
      extras: input.extras,
      name: input.name,
      email: input.email,
      phone: input.phone,
      preferredContact: input.preferredContact,
      pickup: input.pickup,
      invoice: input.invoice,
      nip: input.nip,
      message: input.message,
      consent: { ...input.consent, acceptedAt },
      marketingConsent: input.marketingConsent,
      source: input.source,
      voucher: input.voucher ?? {},
      stock: unit?.id ?? null,
    })
  } catch (error) {
    deps.log.error(errorFields(error), 'Inquiry not saved')
    if (unit) {
      await deps.releaseStock(unit.id).catch((releaseError: unknown) => {
        deps.log.error(
          { stock: unit.id, ...errorFields(releaseError) },
          'Stock reservation not released',
        )
      })
    }
    return { ok: false, error: 'unavailable' }
  }
  const { id } = saved
  // The collection hook always sets it; a missing number is a bug worth a loud log, not a 500.
  const number = saved.number ?? `#${id}`
  if (!saved.number) deps.log.error({ inquiry: id }, 'Inquiry saved without a number')
  deps.log.info({ inquiry: id, type: input.type }, 'Inquiry saved')

  // The record is the source of truth: a failed e-mail is logged, the customer still gets 201.
  const { stock: _stockId, ...fields } = input
  const stock: StockForEmail | null = unit
    ? {
        id: unit.id,
        location: locationOf(unit.location)?.label ?? unit.location,
        conditionNote: unit.conditionNote,
        reservedUntil,
      }
    : null
  const forEmail: InquiryForEmail = {
    ...fields,
    stock,
    number,
    computer: priced && pricing ? computerForEmail(priced, pricing, unit) : null,
    games: games.map((g) => g.name),
    consent: { clauseVersion: input.consent.clauseVersion, acceptedAt },
  }
  await deps.defer(async () => {
    const emails: { kind: string; email: Email }[] = []
    if (deps.notifyTo) {
      emails.push({
        kind: 'notification',
        email: notificationEmail(forEmail, {
          to: deps.notifyTo,
          panelUrl: deps.panelUrl(id, number),
        }),
      })
    } else {
      deps.log.warn({ inquiry: id }, 'INQUIRY_NOTIFY_EMAIL not set: no notification sent')
    }
    const responseTime = await deps.responseTime().catch(() => null)
    const confirmationId = deps.newMessageId()
    emails.push({
      kind: 'confirmation',
      email: {
        ...confirmationEmail(forEmail, { responseTime, replyTo: deps.notifyTo }),
        messageId: confirmationId,
      },
    })

    const results = await Promise.allSettled(emails.map(({ email }) => deps.sendEmail(email)))
    let confirmed = false
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        deps.log.error(
          { inquiry: id, email: emails[i]?.kind, ...errorFields(result.reason) },
          'Inquiry e-mail not sent',
        )
      } else if (emails[i]?.kind === 'confirmation') {
        confirmed = true
      }
    })
    if (confirmed) {
      await deps.saveConfirmationId(id, confirmationId).catch((error: unknown) => {
        deps.log.error({ inquiry: id, ...errorFields(error) }, 'Confirmation id not saved')
      })
    }
  })

  return { ok: true, id, number }
}

// One limiter per process, shared across bundles (Next may load this module more than once).
const LIMITER_KEY = Symbol.for('prokom-gaming.inquiryRateLimiter')
const store = globalThis as typeof globalThis & {
  [LIMITER_KEY]?: ReturnType<typeof createRateLimiter>
}
// 5 inquiries per 10 minutes from one address — plenty for a person, little for a script.
const limiter = (store[LIMITER_KEY] ??= createRateLimiter({ limit: 5, windowMs: 10 * 60_000 }))

/**
 * Accepts an inquiry from the site (ADR-G005): spam checks, validation, the computer priced and
 * checked on the server, save with a number, two e-mails after the response. In 2027 `save` moves to the Django API;
 * the forms stay as they are.
 */
export async function submitInquiry(
  request: SubmitRequest,
  context: { requestId: string },
): Promise<SubmitResult> {
  // Imported lazily: keeps the Payload config and the database out of unit tests.
  const [{ getPayload }, { default: config }, { getEnv }, { log }, pricingStore, { after }] =
    await Promise.all([
      import('payload'),
      import('@payload-config'),
      import('../env'),
      import('../logger'),
      import('./pricingStore'),
      import('next/server'),
    ])
  let payload: Awaited<ReturnType<typeof getPayload>>
  let env: ReturnType<typeof getEnv>
  try {
    payload = await getPayload({ config })
    env = getEnv()
  } catch (error) {
    // Same JSON answer as any other outage, instead of Next's default 500 page (review G6).
    log.error({ requestId: context.requestId, ...errorFields(error) }, 'Inquiry: app not ready')
    return { ok: false, error: 'unavailable' }
  }

  return submitInquiryWith(
    {
      secret: env.PAYLOAD_SECRET,
      now: Date.now,
      limiter,
      loadPricing: () => pricingStore.loadInquiryPricing(payload),
      findGames: async (slugs) => {
        const { docs } = await payload.find({
          collection: 'games',
          where: { slug: { in: slugs } },
          select: { slug: true, name: true },
          limit: slugs.length,
          pagination: false,
          depth: 0,
          overrideAccess: true,
        })
        return docs.map(({ id, slug, name }) => ({ id, slug, name }))
      },
      loadStock: async (id) => {
        const { stockChecker } = await import('../../collections/stockGuard.server')
        const doc = await payload.findByID({
          collection: 'stock',
          id,
          depth: 1,
          overrideAccess: true,
          disableErrors: true,
        })
        if (!doc || typeof doc.build !== 'object' || doc.build === null) return null
        const changes = Object.fromEntries(
          Object.entries(doc.changes ?? {}).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === 'string' && entry[1].trim() !== '',
          ),
        )
        const check = (await stockChecker(payload))({
          buildId: doc.build.id,
          changes: doc.changes,
          discount: doc.discount,
        })
        return {
          id: doc.id,
          marginOk: check.ok,
          buildSlug: doc.build.slug,
          changes,
          discount: doc.discount ?? 0,
          active: doc.active ?? false,
          reservedUntil: doc.reservedUntil ?? null,
          location: doc.location,
          conditionNote: doc.conditionNote,
        }
      },
      // One conditional UPDATE: the row is locked and the condition re-checked by Postgres, so of
      // two reservations at the same moment exactly one changes it (`payload.update` with `where`
      // reads first and writes after — two requests could both see the unit as free).
      reserveStock: async (id, until, now) => {
        const { drizzle } = payload.db as unknown as PostgresAdapter
        const result = await drizzle.execute<{ id: number }>(sql`
          UPDATE "stock" SET "reserved_until" = ${until}, "updated_at" = now()
          WHERE "id" = ${id} AND "active" = true
            AND ("reserved_until" IS NULL OR "reserved_until" <= ${now})
          RETURNING "id"
        `)
        return result.rows.length === 1
      },
      releaseStock: async (id) => {
        await payload.update({
          collection: 'stock',
          id,
          data: { reservedUntil: null },
          depth: 0,
          overrideAccess: true,
          context: { [SKIP_STOCK_GUARD]: true },
        })
      },
      save: (data) =>
        payload.create({ collection: 'inquiries', data, depth: 0, overrideAccess: true }),
      sendEmail: (email) => payload.sendEmail(email),
      newMessageId: () => newMessageId(env.MAIL_FROM_ADDRESS, randomUUID()),
      saveConfirmationId: async (id, messageId) => {
        await payload.update({
          collection: 'inquiries',
          id,
          data: { confirmationMessageId: messageId },
          depth: 0,
          overrideAccess: true,
        })
      },
      defer: (task) => after(task),
      notifyTo: env.INQUIRY_NOTIFY_EMAIL ?? null,
      responseTime: async () => {
        const settings = await payload.findGlobal({
          slug: 'site-settings',
          select: { responseTime: true },
          depth: 0,
          overrideAccess: true,
        })
        return settings.responseTime?.trim() || null
      },
      panelUrl: (_id, number) => `${env.SITE_URL}${inquiryPanelPath(number)}`,
      log: log.child({ requestId: context.requestId }),
    },
    request,
  )
}
