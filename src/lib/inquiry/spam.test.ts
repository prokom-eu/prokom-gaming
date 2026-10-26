import { describe, expect, it } from 'vitest'

import {
  checkFormToken,
  createRateLimiter,
  FORM_MAX_AGE_MS,
  FORM_MIN_FILL_MS,
  isHoneypotFilled,
  issueFormToken,
  rateLimitKey,
} from './spam'

const secret = 's'.repeat(32)
const t0 = Date.UTC(2026, 9, 17, 12)

describe('honeypot', () => {
  it('passes when the hidden field is missing or empty', () => {
    expect(isHoneypotFilled(undefined)).toBe(false)
    expect(isHoneypotFilled('')).toBe(false)
  })

  it('catches a filled hidden field', () => {
    expect(isHoneypotFilled('https://spam.example')).toBe(true)
    expect(isHoneypotFilled(1)).toBe(true)
  })
})

describe('form token (minimum fill time)', () => {
  const token = issueFormToken(secret, t0)

  it('accepts a form filled in after the minimum time', () => {
    expect(checkFormToken(token, secret, t0 + FORM_MIN_FILL_MS)).toBe('ok')
  })

  it('rejects a form sent too fast', () => {
    expect(checkFormToken(token, secret, t0 + FORM_MIN_FILL_MS - 1)).toBe('too_fast')
  })

  it('rejects an expired form', () => {
    expect(checkFormToken(token, secret, t0 + FORM_MAX_AGE_MS + 1)).toBe('expired')
  })

  it('rejects a token from the future (clock moved back or forged)', () => {
    expect(checkFormToken(issueFormToken(secret, t0 + 60_000), secret, t0)).toBe('too_fast')
  })

  it.each([
    undefined,
    '',
    'abc',
    `${t0}`,
    `${t0}.`,
    `${t0 - 10_000}.${token.split('.')[1]}`,
    token.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')),
  ])('rejects a missing, malformed or forged token: %j', (value) => {
    expect(checkFormToken(value, secret, t0 + FORM_MIN_FILL_MS)).toBe('invalid')
  })

  it('rejects a token signed with another secret', () => {
    expect(checkFormToken(issueFormToken('o'.repeat(32), t0), secret, t0 + FORM_MIN_FILL_MS)).toBe(
      'invalid',
    )
  })
})

describe('rate limiter', () => {
  it('allows the limit within the window, then blocks', () => {
    let now = t0
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => now })
    expect([1, 2, 3].map(() => limiter.hit('a'))).toEqual([true, true, true])
    expect(limiter.hit('a')).toBe(false)
    expect(limiter.hit('b')).toBe(true)
    now += 60_001
    expect(limiter.hit('a')).toBe(true)
  })

  it('keeps the number of tracked keys bounded', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2, now: () => t0 })
    limiter.hit('a')
    limiter.hit('b')
    limiter.hit('c')
    expect(limiter.size()).toBeLessThanOrEqual(2)
  })

  it('keys by a keyed hash, never the IP itself', () => {
    const key = rateLimitKey('203.0.113.7', secret)
    expect(key).not.toContain('203.0.113.7')
    expect(key).toBe(rateLimitKey('203.0.113.7', secret))
    expect(key).not.toBe(rateLimitKey('203.0.113.8', secret))
  })
})
