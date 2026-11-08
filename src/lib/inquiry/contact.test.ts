import { describe, expect, it } from 'vitest'

import { CONTACT_CONSENT_CLAUSE } from './consent'
import {
  CONTACT_MESSAGES,
  contactErrors,
  contactFieldOf,
  contactPayload,
  contactSendErrorOf,
  EMPTY_CONTACT,
} from './contact'
import { parseInquiryInput } from './schema'

const filled = {
  name: 'Ola',
  email: 'ola@example.test',
  message: 'Czy macie Skrzata?',
  consent: true,
}
const context = { url: 'https://prokomgaming.pl/kontakt?utm_source=fb', token: 't', honeypot: '' }

describe('contactErrors', () => {
  it('shows every board message on an empty form', () => {
    expect(contactErrors(EMPTY_CONTACT)).toEqual({
      name: CONTACT_MESSAGES.name,
      email: CONTACT_MESSAGES.emailEmpty,
      message: CONTACT_MESSAGES.message,
      consent: CONTACT_MESSAGES.consent,
    })
  })

  it('tells an incomplete e-mail apart from an empty one', () => {
    expect(contactErrors({ ...filled, email: 'ola@poczta' })).toEqual({
      email: CONTACT_MESSAGES.emailInvalid,
    })
  })

  it('accepts a filled form', () => {
    expect(contactErrors(filled)).toEqual({})
  })
})

describe('contactPayload', () => {
  it('is a valid `contact` inquiry with the contact clause and UTM', () => {
    const body = contactPayload(filled, context)
    expect(body).toMatchObject({
      type: 'contact',
      consent: { accepted: true, clauseVersion: CONTACT_CONSENT_CLAUSE.version },
      source: { utmSource: 'fb' },
    })
    expect(parseInquiryInput(body).success).toBe(true)
  })
})

describe('answers of the API', () => {
  it('maps the status to a message and the rejected field to the form', () => {
    expect(contactSendErrorOf(429)).toBe('rate_limited')
    expect(contactSendErrorOf(400, 'rejected')).toBe('expired')
    expect(contactSendErrorOf(400, 'invalid')).toBe('invalid')
    expect(contactSendErrorOf(503)).toBe('unavailable')
    expect(contactFieldOf(['source.url', 'consent.accepted'])).toBe('consent')
    expect(contactFieldOf(['source.url'])).toBeNull()
  })
})
