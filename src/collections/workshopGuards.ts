import { APIError } from 'payload'
import type { CollectionBeforeDeleteHook, CollectionBeforeOperationHook } from 'payload'

import { createRateLimiter, rateLimitKey } from '../lib/inquiry/spam'
import { getEnv } from '../lib/env'

/** A message the panel shows; `data` and `name` set as in `usage.ts` (production builds drop it). */
function refuse(message: string, status: number): never {
  const error = new APIError(message, status, null, true)
  error.name = 'APIError'
  throw error
}

/**
 * A unit or ticket references the record (`NOT NULL` columns with `ON DELETE set null` in the
 * migration): without this the database refuses with a raw error. Says what to remove first.
 */
export function blockDeleteWhenReferenced(
  collection: 'units' | 'tickets',
  field: 'build' | 'unit',
  what: string,
): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    const { totalDocs } = await req.payload.count({
      collection,
      where: { [field]: { equals: id } },
      overrideAccess: true,
      req,
    })
    if (totalDocs > 0) {
      refuse(`Nie można usunąć — ${what}: ${totalDocs}. Usuń je najpierw (Warsztat).`, 400)
    }
  }
}

// One limiter per process, shared across bundles: 5 reset e-mails / 15 min per address.
const LIMITER_KEY = Symbol.for('prokom-gaming.forgotPasswordRateLimiter')
const store = globalThis as typeof globalThis & {
  [LIMITER_KEY]?: ReturnType<typeof createRateLimiter>
}
const limiter = (store[LIMITER_KEY] ??= createRateLimiter({ limit: 5, windowMs: 15 * 60_000 }))

/**
 * Payload limits reset e-mails per account (15 s), not per sender: a script could flood any
 * customer's inbox. Same per-IP limit as the inquiry form (`X-Real-IP`, set by Nginx — G16).
 */
export const limitForgotPassword: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'forgotPassword') return args
  const ip = req.headers?.get('x-real-ip')?.trim() || 'unknown'
  if (!limiter.hit(rateLimitKey(`forgot:${ip}`, getEnv().PAYLOAD_SECRET))) {
    refuse('Za dużo próśb o nowe hasło. Spróbuj za kilkanaście minut.', 429)
  }
  return args
}
