import { createHmac, timingSafeEqual } from 'node:crypto'

// Spam protection without third-party services (ADR-G005, same as prokom-web ADR-003): a honeypot
// field, a signed "form shown at" time (bots post instantly) and a per-IP limit kept in memory.

export { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from './honeypot'
export const FORM_MIN_FILL_MS = 3_000
// A form left open longer than a day is reloaded rather than accepted.
export const FORM_MAX_AGE_MS = 24 * 60 * 60 * 1000

export function isHoneypotFilled(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ''
}

function sign(issuedAt: number, secret: string): string {
  return createHmac('sha256', secret).update(`inquiry-form:${issuedAt}`).digest('base64url')
}

/** `<issuedAt>.<signature>`; rendered into the form by the server (G12). */
export function issueFormToken(secret: string, now: number = Date.now()): string {
  return `${now}.${sign(now, secret)}`
}

export type FormTokenCheck = 'ok' | 'invalid' | 'too_fast' | 'expired'

export function checkFormToken(
  token: unknown,
  secret: string,
  now: number = Date.now(),
): FormTokenCheck {
  if (typeof token !== 'string') return 'invalid'
  const match = /^(\d{1,15})\.([\w-]{43})$/.exec(token)
  if (!match) return 'invalid'
  const issuedAt = Number(match[1])
  const expected = Buffer.from(sign(issuedAt, secret))
  const given = Buffer.from(match[2] as string)
  if (!timingSafeEqual(expected, given)) return 'invalid'
  const age = now - issuedAt
  if (age < FORM_MIN_FILL_MS) return 'too_fast'
  if (age > FORM_MAX_AGE_MS) return 'expired'
  return 'ok'
}

/** Keyed hash of the client IP: the limiter never holds the address itself (ADR-G005). */
export function rateLimitKey(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(`inquiry-ip:${ip}`).digest('hex')
}

type RateLimiterOptions = {
  limit: number
  windowMs: number
  /** Upper bound of tracked keys; the oldest are dropped first. */
  maxKeys?: number
  now?: () => number
}

/**
 * Sliding-window limiter in process memory. Enough for one app container; a restart resets it.
 * Several instances would need a shared store.
 */
export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
  now = Date.now,
}: RateLimiterOptions) {
  const hits = new Map<string, number[]>()

  return {
    /** Records an attempt; `false` when the key is over the limit. */
    hit(key: string): boolean {
      const current = now()
      const recent = (hits.get(key) ?? []).filter((time) => current - time < windowMs)
      const allowed = recent.length < limit
      if (allowed) recent.push(current)
      // Re-insert so Map order stays "least recently used first".
      hits.delete(key)
      hits.set(key, recent)
      while (hits.size > maxKeys) {
        const oldest = hits.keys().next().value as string
        hits.delete(oldest)
      }
      return allowed
    },
    size: () => hits.size,
  }
}
