import 'server-only'

import { randomUUID } from 'node:crypto'

import type { Payload } from 'payload'

import type { Inquiry, User } from '../../payload-types'
import { errorFields } from '../logger'
import { zl } from '../pricing/format'
import type { Config } from '../pricing/types'
import { priceComputer } from './price'
import { loadInquiryPricing } from './pricingStore'
import { buildReplyMail, newMessageId, type ReplyMail } from './replyMail'
import { statusAfterReply } from './status'
import { inquiryTopic } from './subject'
import { partsList, placeholdersIn, type TemplateValues } from './templates'
import { CONFIG_TYPES } from './types'

/**
 * The thread of an inquiry on the server (ADR-G008, panel spec §4): values of the template
 * variables, sending a reply and adding a note. Used only by the panel's actions, which check
 * the admin role first — `{czesci}` lists internal models (allowed in an offer, never on the site,
 * ADR-G002 §8.7), so nothing here may run for anyone else.
 */

/** Second lock behind the actions' check: internal models and the thread are for `admin` only. */
export class NotAdminError extends Error {
  constructor() {
    super('Inquiry thread: admin role required')
    this.name = 'NotAdminError'
  }
}
const requireAdmin = (user: Pick<User, 'role'>) => {
  if (user.role !== 'admin') throw new NotAdminError()
}

const PART_ORDER = ['cpu', 'gpu', 'mobo', 'psu'] as const
const OPTION_KEYS = ['ram', 'ssd', 'case', 'cooler'] as const satisfies readonly (keyof Config)[]

const buildName = (inquiry: Pick<Inquiry, 'build'>) =>
  typeof inquiry.build === 'object' && inquiry.build ? inquiry.build.name : null

/** What the thread is about: list, header and the reply subject say the same. */
export const topicOf = (inquiry: Pick<Inquiry, 'type' | 'build' | 'budget' | 'voucher'>) =>
  inquiryTopic({
    type: inquiry.type,
    buildName: buildName(inquiry),
    budget: inquiry.budget,
    voucherAmount: inquiry.voucher?.amount,
  })

const fullConfig = (config: Inquiry['config']): Config | null => {
  const { level, case: caseCode, cooler, ram, ssd } = config ?? {}
  return level && caseCode && cooler && ram && ssd
    ? { level, case: caseCode, cooler, ram, ssd }
    : null
}

/** Internal models of the configuration: CPU, GPU, board, PSU, then RAM, disk, case, cooling. */
async function internalModels(payload: Payload, config: Config): Promise<string[]> {
  const [levels, options] = await Promise.all([
    payload.find({
      collection: 'power-levels',
      where: { code: { equals: config.level } },
      select: { components: true },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'options',
      where: { code: { in: OPTION_KEYS.map((key) => config[key]) } },
      select: { code: true, internalModel: true },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
  ])
  const components = levels.docs[0]?.components ?? []
  const byCode = new Map(options.docs.map((o) => [o.code, o.internalModel]))
  const levelModels = PART_ORDER.flatMap((role) =>
    components.filter((c) => c.role === role).map((c) => c.internalModel),
  )
  return [...levelModels, ...OPTION_KEYS.map((key) => byCode.get(config[key]) ?? '')]
}

export type ReplyContext = {
  values: TemplateValues
  /** Today's price of the configuration (newest batch); `null` = no computer or not priceable. */
  priceToday: number | null
}

/**
 * Template values of one inquiry. `{cena}` is today's price from the newest published batch
 * (decision 31.10.2026: an offer is valid 48 h from today); the panel warns when it differs from
 * the price at the inquiry. A unit „od ręki” keeps the price it was reserved at (own discount).
 */
export async function loadReplyContext(
  payload: Payload,
  inquiry: Inquiry,
  user: Pick<User, 'role'>,
): Promise<ReplyContext> {
  requireAdmin(user)
  const [settings, site] = await Promise.all([
    payload.findGlobal({ slug: 'mail-settings', depth: 0, overrideAccess: true }),
    payload.findGlobal({
      slug: 'site-settings',
      select: { fulfilment: true },
      depth: 0,
      overrideAccess: true,
    }),
  ])
  const config = fullConfig(inquiry.config)
  const hasComputer =
    (CONFIG_TYPES as readonly string[]).includes(inquiry.type) || inquiry.type === 'ready'

  let priceToday: number | null = null
  let parts: string | null = null
  if (hasComputer && config) {
    const [pricing, models] = await Promise.all([
      loadInquiryPricing(payload),
      internalModels(payload, config),
    ])
    if (inquiry.type === 'ready') {
      priceToday = inquiry.priceAtInquiry ?? null
    } else if (pricing) {
      const result = priceComputer({ config }, pricing.offer, pricing.snapshot)
      priceToday = result.ok ? result.price : null
    }
    parts = partsList(models)
  }

  return {
    priceToday,
    values: {
      nr: inquiry.number,
      zestaw: hasComputer ? topicOf(inquiry) : null,
      cena: priceToday === null ? null : zl(priceToday),
      czesci: parts,
      termin: site.fulfilment,
      podpis: settings.signature,
    },
  }
}

export type SendReplyResult =
  /** `mail` and `at`: what went out, for the copy in the mailbox's „Sent” (P4). */
  | { ok: true; status: Inquiry['status']; mail: ReplyMail; at: string }
  | { ok: false; error: 'empty' | 'placeholders' | 'smtp'; missing?: string[] }
  /** Sent, but not recorded: the panel must say „do not send again” (customer has the mail). */
  | { ok: false; error: 'not_recorded'; messageId: string }

/**
 * Sends one reply (ADR-G008 pt 1, 5): checks that no `{variable}` is left, sends from the Gaming
 * mailbox with `Re: [PKG-…]`, our `Message-ID` and the thread headers, then saves the message and
 * moves the status. Nothing is saved when SMTP fails — the panel shows the error and keeps the
 * text. When the mail went out but saving fails, the result says so (`not_recorded`), so the
 * reply is not sent twice. Logs ids only.
 */
export async function sendInquiryReply(
  payload: Payload,
  input: {
    inquiry: Inquiry
    body: string
    templateId: number | null
    user: User
    fromAddress: string
  },
): Promise<SendReplyResult> {
  requireAdmin(input.user)
  const body = input.body.replace(/\r\n/g, '\n').trim()
  if (!body) return { ok: false, error: 'empty' }
  const missing = placeholdersIn(body)
  if (missing.length > 0) return { ok: false, error: 'placeholders', missing }

  const { inquiry } = input
  const [template, earlier] = await Promise.all([
    input.templateId === null
      ? null
      : payload.findByID({
          collection: 'reply-templates',
          id: input.templateId,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
        }),
    payload.find({
      collection: 'inquiry-messages',
      where: {
        and: [{ inquiry: { equals: inquiry.id } }, { messageId: { exists: true } }],
      },
      select: { messageId: true },
      sort: 'at',
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const messageId = newMessageId(input.fromAddress, randomUUID())
  const mail = buildReplyMail({
    to: inquiry.email,
    number: inquiry.number ?? `#${inquiry.id}`,
    topic: topicOf(inquiry),
    body,
    messageId,
    previousIds: [inquiry.confirmationMessageId, ...earlier.docs.map((m) => m.messageId)],
  })
  try {
    await payload.sendEmail(mail)
  } catch (error) {
    payload.logger.error({ inquiry: inquiry.id, ...errorFields(error) }, 'Inquiry reply not sent')
    return { ok: false, error: 'smtp' }
  }

  const now = new Date().toISOString()
  const status = statusAfterReply(inquiry.status, template?.kind ?? null)
  try {
    await payload.create({
      collection: 'inquiry-messages',
      data: {
        inquiry: inquiry.id,
        direction: 'out',
        at: now,
        subject: mail.subject,
        body,
        author: input.user.id,
        messageId,
        inReplyTo: mail.inReplyTo ?? null,
        template: template?.id ?? null,
      },
      depth: 0,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'inquiries',
      id: inquiry.id,
      data: { status, lastActivityAt: now },
      depth: 0,
      overrideAccess: true,
      user: input.user,
    })
  } catch (error) {
    payload.logger.error(
      { inquiry: inquiry.id, messageId, ...errorFields(error) },
      'Inquiry reply sent but not recorded',
    )
    return { ok: false, error: 'not_recorded', messageId }
  }
  payload.logger.info({ inquiry: inquiry.id, status }, 'Inquiry reply sent')
  return { ok: true, status, mail, at: now }
}

/** An internal note (blue in the thread): never e-mailed, the customer never sees it. */
export async function addInquiryNote(
  payload: Payload,
  input: { inquiryId: number; body: string; user: User },
): Promise<{ ok: true } | { ok: false; error: 'empty' }> {
  requireAdmin(input.user)
  const body = input.body.replace(/\r\n/g, '\n').trim()
  if (!body) return { ok: false, error: 'empty' }
  await payload.create({
    collection: 'inquiry-messages',
    data: {
      inquiry: input.inquiryId,
      direction: 'note',
      at: new Date().toISOString(),
      body,
      author: input.user.id,
    },
    depth: 0,
    overrideAccess: true,
  })
  return { ok: true }
}
