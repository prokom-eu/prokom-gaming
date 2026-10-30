import { describe, expect, it } from 'vitest'

import { EMPTY_QUICK, QUICK_MESSAGES, quickErrors, quickPayload, quickSendErrorOf } from './quick'
import { parseInquiryInput } from './schema'

const filled = { name: 'Ola', email: 'ola@example.test', phone: '', consent: true }
const context = { url: 'https://prokomgaming.pl/bon?utm_source=ig', token: 't', honeypot: '' }

describe('quickErrors', () => {
  it('needs name, e-mail and consent; the phone only when typed', () => {
    expect(quickErrors(EMPTY_QUICK)).toEqual({
      name: QUICK_MESSAGES.name,
      email: QUICK_MESSAGES.emailEmpty,
      consent: QUICK_MESSAGES.consent,
    })
    expect(quickErrors(filled)).toEqual({})
    expect(quickErrors({ ...filled, phone: 'abc' })).toEqual({ phone: QUICK_MESSAGES.phone })
  })
})

describe('quickPayload', () => {
  it('a voucher order is a valid inquiry', () => {
    const body = quickPayload(
      { type: 'voucher', voucher: { amount: 2000, design: 'wampir', recipient: 'Dla Kuby' } },
      filled,
      context,
    )
    expect(body).toMatchObject({ type: 'voucher', source: { utmSource: 'ig' } })
    expect(body).not.toHaveProperty('phone')
    expect(parseInquiryInput(body).success).toBe(true)
  })

  it('a reservation sends only the unit id — never a price', () => {
    const body = quickPayload(
      { type: 'ready', stock: 4 },
      { ...filled, phone: '600 100 200' },
      context,
    )
    expect(body).toMatchObject({ type: 'ready', stock: 4, phone: '600 100 200' })
    expect(JSON.stringify(body)).not.toMatch(/price/i)
    expect(parseInquiryInput(body).success).toBe(true)
  })
})

describe('quickSendErrorOf', () => {
  it('a refused unit reads as taken; the rest like the contact form', () => {
    expect(quickSendErrorOf(400, { error: 'invalid', fields: ['stock'] })).toBe('taken')
    expect(quickSendErrorOf(400, { error: 'rejected' })).toBe('expired')
    expect(quickSendErrorOf(429, {})).toBe('rate_limited')
  })
})
