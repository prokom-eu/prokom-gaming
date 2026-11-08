import { describe, expect, it } from 'vitest'

import { ACCOUNT_CONSENT_CLAUSE } from '../inquiry/consent'
import {
  fieldErrors,
  profileSchema,
  registerSchema,
  savedConfigSchema,
  ticketSchema,
} from './schema'

const consent = { accepted: true, clauseVersion: ACCOUNT_CONSENT_CLAUSE.version }
const register = { name: 'Jan', email: 'jan@example.test', password: 'a'.repeat(12), consent }

const errorsOf = (schema: typeof registerSchema | typeof ticketSchema, input: unknown) => {
  const result = schema.safeParse(input)
  return result.success ? [] : fieldErrors(result.error)
}

describe('registerSchema', () => {
  it('accepts a complete form and normalises the e-mail', () => {
    const parsed = registerSchema.parse({ ...register, email: ' Jan@Example.TEST ' })
    expect(parsed.email).toBe('jan@example.test')
  })

  it('drops anything that is not a form field (no _verified, no role)', () => {
    const parsed = registerSchema.parse({ ...register, _verified: true, role: 'admin' })
    expect(parsed).not.toHaveProperty('_verified')
    expect(parsed).not.toHaveProperty('role')
  })

  it('requires 12 characters of password, the consent and its current version', () => {
    expect(errorsOf(registerSchema, { ...register, password: 'a'.repeat(11) })).toContain(
      'password',
    )
    expect(
      errorsOf(registerSchema, { ...register, consent: { ...consent, accepted: false } }),
    ).toContain('consent.accepted')
    expect(
      errorsOf(registerSchema, { ...register, consent: { ...consent, clauseVersion: '2020' } }),
    ).toContain('consent.clauseVersion')
    expect(errorsOf(registerSchema, { ...register, email: 'nie-mail' })).toContain('email')
    expect(errorsOf(registerSchema, { ...register, name: '  ' })).toContain('name')
  })
})

describe('ticketSchema', () => {
  const ticket = {
    unit: 3,
    category: 'stutter',
    description: 'Gra się tnie',
    remoteHelpConsent: true,
  }

  it('accepts a board category and a short description', () => {
    expect(ticketSchema.parse(ticket)).toEqual(ticket)
  })

  it('rejects unknown categories, empty or too long descriptions', () => {
    expect(errorsOf(ticketSchema, { ...ticket, category: 'hack' })).toContain('category')
    expect(errorsOf(ticketSchema, { ...ticket, description: ' ' })).toContain('description')
    expect(errorsOf(ticketSchema, { ...ticket, description: 'x'.repeat(2001) })).toContain(
      'description',
    )
    expect(errorsOf(ticketSchema, { ...ticket, unit: '3' })).toContain('unit')
  })
})

describe('savedConfigSchema', () => {
  it('accepts five codes and a known light', () => {
    const input = { label: 'Moc 4, biała', k: 'P13.LB500.PL3LX.R32.NM1', light: 'lod' }
    expect(savedConfigSchema.parse(input)).toEqual(input)
  })

  it('rejects broken codes and unknown lights', () => {
    expect(savedConfigSchema.safeParse({ label: 'x', k: 'P13.LB500' }).success).toBe(false)
    expect(
      savedConfigSchema.safeParse({ label: 'x', k: 'P13.LB500.PL3LX.R32.NM1', light: 'neon' })
        .success,
    ).toBe(false)
  })
})

describe('profileSchema', () => {
  it('takes a name and an optional phone', () => {
    expect(profileSchema.parse({ name: ' Ola ', phone: '' })).toEqual({ name: 'Ola', phone: '' })
    expect(profileSchema.safeParse({ name: 'Ola', phone: '+48 600 100 200' }).success).toBe(true)
    expect(profileSchema.safeParse({ name: 'Ola', phone: 'abc' }).success).toBe(false)
  })
})
