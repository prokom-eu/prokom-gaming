import { z } from 'zod'

import { PASSWORD_MIN_LENGTH } from '../auth/password'
import { decodeConfig } from '../configurator'
import { ACCOUNT_CONSENT_CLAUSE } from '../inquiry/consent'
import { LIGHT_COLOR_CHOICES } from '../inquiry/types'
import { TICKET_CATEGORIES, TICKET_DESCRIPTION_MAX } from './tickets'

// What the account forms send to `/api/konto/*` (G14). Only these fields ever reach the database:
// the routes write them field by field, never the request body as a whole.

/** Same e-mail rules as Payload's e-mail field: anything it would reject fails here first. */
const email = z.string().trim().toLowerCase().max(254).pipe(z.email())

const name = z.string().trim().min(1).max(80)

export const registerSchema = z.object({
  name,
  email,
  // Payload hashes it; the policy (12 characters) is checked again in the collection hook.
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200),
  consent: z.object({
    accepted: z.literal(true),
    clauseVersion: z.literal(ACCOUNT_CONSENT_CLAUSE.version),
  }),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const ticketSchema = z.object({
  unit: z.number().int().positive(),
  category: z.enum(TICKET_CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  description: z.string().trim().min(1).max(TICKET_DESCRIPTION_MAX),
  remoteHelpConsent: z.boolean(),
})
export type TicketInput = z.infer<typeof ticketSchema>

const LIGHTS = LIGHT_COLOR_CHOICES.map((l) => l.value) as [string, ...string[]]

export const savedConfigSchema = z.object({
  label: z.string().trim().min(1).max(80),
  // Five well-formed codes of the configurator address (`k=`).
  k: z
    .string()
    .max(120)
    .refine((k) => decodeConfig(k) !== null, 'invalid configuration'),
  light: z.enum(LIGHTS).nullable().optional(),
})
export type SavedConfigInput = z.infer<typeof savedConfigSchema>

export const profileSchema = z.object({
  name,
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === '' || /^[+\d][\d\s-]{6,}$/.test(v), 'invalid phone'),
})
export type ProfileInput = z.infer<typeof profileSchema>

/** Field paths of a failed parse, for the form to mark (`consent.accepted`, `email`…). */
export function fieldErrors(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((issue) => issue.path.join('.')))]
}
