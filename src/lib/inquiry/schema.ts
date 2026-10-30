import { z } from 'zod'

import { ITEM_CODE } from '../pricing/types'
import { CONSENT_CLAUSE } from './consent'
import { isValidNip, normalizeNip } from './nip'
import {
  ACCEPTED_TYPES,
  BUDGET_CHOICES,
  CASE_COLOR_CHOICES,
  choiceValues,
  CONFIG_TYPES,
  EXTRA_CHOICES,
  FOR_WHOM_CHOICES,
  INVOICE_CHOICES,
  LIGHT_COLOR_CHOICES,
  LIGHTING_CHOICES,
  MONITOR_CHOICES,
  PICKUP_CHOICES,
  PREFERRED_CONTACT_CHOICES,
  REFRESH_CHOICES,
  type InquiryType,
} from './types'

// Empty form fields arrive as "" — treat them as missing, like an untouched optional field.
const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional())

const requiredText = (max: number) => z.string().trim().min(1).max(max)

const optionalChoice = <V extends string>(choices: readonly { value: V }[]) =>
  z.preprocess(blankToUndefined, z.enum(choiceValues(choices)).optional())

/** Item code of a level or an option (`P07`, `SIG3A`); the price list decides if it exists. */
const code = z.string().trim().regex(ITEM_CODE)

const slug = z
  .string()
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)

/**
 * Payload's own e-mail rule (payload 3.91 `fields/validations.js`, field type `email`). Zod 4 lets
 * through e.g. `jan@foo-.pl`; without the same rule here the collection would reject the record
 * after validation and the customer would get 503 instead of 400 `email` (review G6).
 */
const PAYLOAD_EMAIL =
  /^(?!.*\.\.)[\w!#$%&'*+/=?^`{|}~-](?:[\w!#$%&'*+/=?^`{|}~.-]*[\w!#$%&'*+/=?^`{|}~-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i

/** At least 6 digits once spaces, brackets and hyphens are gone (not `------`). */
const isPhone = (value: string) =>
  /^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, '').length >= 6

const uniqueList = <T extends z.ZodType<string>>(item: T, max: number) =>
  z
    .array(item)
    .max(max)
    .default([])
    .refine((list) => new Set(list).size === list.length, 'duplicates')

/**
 * What the site may send (ADR-G005, 1:1 with the future `Inquiry` model in Django). The number,
 * status, price, dates and consent time are set by the server; unknown keys (a price from the
 * browser, too) are dropped.
 */
const baseSchema = z.object({
  type: z.enum(ACCEPTED_TYPES),
  // Computer: a build (slug) and/or item codes. For a build the codes are changes to its recipe
  // („Dopasuj”); for `config` all five are required. The server prices and checks them.
  build: z.preprocess(blankToUndefined, slug.optional()),
  config: z
    .object({
      level: code.optional(),
      case: code.optional(),
      cooler: code.optional(),
      ram: code.optional(),
      ssd: code.optional(),
    })
    .optional(),
  // Light colour from „Dopasuj” / the configurator; empty = the creature's own light.
  lightColor: optionalChoice(LIGHT_COLOR_CHOICES),
  forWhom: optionalChoice(FOR_WHOM_CHOICES),
  budget: optionalChoice(BUDGET_CHOICES),
  customList: optionalText(5000),
  // Games and looks (step 2 of the form).
  games: uniqueList(slug, 40),
  otherGames: optionalText(300),
  monitor: optionalChoice(MONITOR_CHOICES),
  refresh: optionalChoice(REFRESH_CHOICES),
  caseColor: optionalChoice(CASE_COLOR_CHOICES),
  lighting: optionalChoice(LIGHTING_CHOICES),
  extras: uniqueList(z.enum(choiceValues(EXTRA_CHOICES)), EXTRA_CHOICES.length),
  // Contact (step 3). E-mail always: the offer goes by e-mail (Krystian 27.10.2026, board).
  name: requiredText(120),
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email())
    .refine((v) => PAYLOAD_EMAIL.test(v), 'invalid e-mail'),
  phone: optionalText(30).refine((value) => value === undefined || isPhone(value), 'invalid phone'),
  preferredContact: optionalChoice(PREFERRED_CONTACT_CHOICES),
  pickup: optionalChoice(PICKUP_CHOICES),
  invoice: optionalChoice(INVOICE_CHOICES),
  nip: optionalText(20)
    .refine((value) => value === undefined || isValidNip(value), 'invalid NIP')
    .transform((value) => (value === undefined ? undefined : normalizeNip(value))),
  message: optionalText(5000),
  consent: z.object({
    accepted: z.literal(true),
    clauseVersion: z.literal(CONSENT_CLAUSE.version),
  }),
  marketingConsent: z.boolean().default(false),
  source: z.object({
    url: z.url({ protocol: /^https?$/ }).max(2000),
    utmSource: optionalText(200),
    utmMedium: optionalText(200),
    utmCampaign: optionalText(200),
  }),
})

export type InquiryInput = z.infer<typeof baseSchema>

const CONFIG_KEYS = ['level', 'case', 'cooler', 'ram', 'ssd'] as const

const isConfigType = (type: InquiryType) => (CONFIG_TYPES as readonly string[]).includes(type)

/** Rules that depend on the type: each field belongs where the form asks for it. */
const inquirySchema = baseSchema.superRefine((data, ctx) => {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: 'custom', path: path.split('.'), message })
  const codes = data.config ?? {}

  if (isConfigType(data.type)) {
    const complete = CONFIG_KEYS.every((key) => codes[key] !== undefined)
    if (data.type === 'build' && data.build === undefined) issue('build', 'build required')
    if (data.type === 'config' && !complete) {
      for (const key of CONFIG_KEYS) {
        if (codes[key] === undefined) issue(`config.${key}`, 'code required')
      }
    }
    // From a comparison: a build (maybe changed) or a full configuration.
    if (data.type === 'compare' && data.build === undefined && !complete) {
      issue('build', 'build or full configuration required')
    }
  } else {
    // A computer is saved only where the customer picked one; elsewhere nobody asked for it.
    if (data.build !== undefined) issue('build', 'build only with a computer')
    if (data.config !== undefined) issue('config', 'configuration only with a computer')
    if (data.lightColor !== undefined) issue('lightColor', 'light colour only with a computer')
  }

  if (data.type !== 'advice') {
    if (data.forWhom !== undefined) issue('forWhom', 'only in advice')
    if (data.budget !== undefined) issue('budget', 'only in advice')
  }
  if (data.type !== 'custom_list' && data.customList !== undefined) {
    issue('customList', 'only in custom_list')
  }
  // „Krótkie pytanie” is the message itself.
  if (data.type === 'contact' && data.message === undefined) issue('message', 'message required')

  if (data.preferredContact === 'phone' && data.phone === undefined) {
    issue('phone', 'phone required for phone contact')
  }
  // NIP belongs to a company invoice, and a company invoice needs one.
  if (data.invoice === 'company' && data.nip === undefined) issue('nip', 'NIP required')
  if (data.invoice !== 'company' && data.nip !== undefined) issue('nip', 'NIP only for a company')
})

/** Validates a request body (anything — it comes from the network). */
export function parseInquiryInput(input: unknown) {
  return inquirySchema.safeParse(input)
}

/** Paths of the invalid fields (e.g. `config.ram`) — never the submitted values. */
export function inquiryFieldErrors(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((issue) => issue.path.join('.')))]
}
