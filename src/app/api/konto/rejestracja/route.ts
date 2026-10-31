import { randomBytes } from 'node:crypto'

import config from '@payload-config'
import { getPayload } from 'payload'

import { VERIFY_SUBJECT, verifyEmailHtml, verifyUrl } from '@/lib/account/emails'
import { readJsonBody } from '@/lib/account/session.server'
import { fieldErrors, registerSchema } from '@/lib/account/schema'
import { getEnv } from '@/lib/env'
import {
  checkFormToken,
  createRateLimiter,
  FORM_TOKEN_FIELD,
  HONEYPOT_FIELD,
  isHoneypotFilled,
  rateLimitKey,
} from '@/lib/inquiry/spam'
import { errorFields, log } from '@/lib/logger'

const json = (body: unknown, status: number) => Response.json(body, { status })

// One limiter per process, shared across bundles (like inquiries): 5 sign-ups / 10 min per address.
const LIMITER_KEY = Symbol.for('prokom-gaming.registerRateLimiter')
const store = globalThis as typeof globalThis & {
  [LIMITER_KEY]?: ReturnType<typeof createRateLimiter>
}
const limiter = (store[LIMITER_KEY] ??= createRateLimiter({ limit: 5, windowMs: 10 * 60_000 }))

/**
 * `POST /api/konto/rejestracja` — sets up a customer account (ADR-G005). The account starts
 * unverified: Payload e-mails the link (`verify`), and only then the customer can sign in and
 * see orders by their e-mail. The same answer for a new and an existing e-mail, so the form does
 * not tell who has an account; an unverified account gets a fresh link (see below). Spam protection as in inquiries (honeypot, signed time, limit).
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request)
  if (!body || typeof body !== 'object') return json({ error: 'invalid', fields: [] }, 400)
  const env = getEnv()
  const record = body as Record<string, unknown>
  if (
    isHoneypotFilled(record[HONEYPOT_FIELD]) ||
    checkFormToken(record[FORM_TOKEN_FIELD], env.PAYLOAD_SECRET) !== 'ok'
  ) {
    return json({ error: 'spam' }, 400)
  }
  const ip = request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (!limiter.hit(rateLimitKey(`register:${ip}`, env.PAYLOAD_SECRET))) {
    return json({ error: 'rate_limited' }, 429)
  }
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'invalid', fields: fieldErrors(parsed.error) }, 400)
  const input = parsed.data

  const payload = await getPayload({ config })
  const consent = {
    clauseVersion: input.consent.clauseVersion,
    acceptedAt: new Date().toISOString(),
  }
  const existing = await payload.find({
    collection: 'customers',
    where: { email: { equals: input.email } },
    select: { _verified: true },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const found = existing.docs[0] as { id: number; _verified?: boolean | null } | undefined
  if (found?._verified === true) {
    // TODO(krystian): e-mail the owner "someone tried to set up an account on your address"?
    return json({ ok: true }, 201)
  }
  if (found) {
    // Not verified yet: nobody has proven they own this address, so a new sign-up takes over
    // the account (name, password, consent) and gets a fresh link. Without this a lost link — or
    // a stranger who signed up first — would lock the address for good (Payload 3.91 has no
    // "resend", and a password reset does not verify). Ownership is still proven by the link.
    try {
      const token = randomBytes(20).toString('hex')
      await payload.update({
        collection: 'customers',
        id: found.id,
        data: { name: input.name, password: input.password, consent, _verificationToken: token },
        overrideAccess: true,
        depth: 0,
      })
      await payload.sendEmail({
        to: input.email,
        subject: VERIFY_SUBJECT,
        html: verifyEmailHtml({ name: input.name, link: verifyUrl(env.SITE_URL, token) }),
      })
    } catch (error) {
      log.error({ ...errorFields(error) }, 'customer re-registration failed')
      return json({ error: 'unavailable' }, 503)
    }
    return json({ ok: true }, 201)
  }
  try {
    await payload.create({
      collection: 'customers',
      // Field by field: never `_verified`, never anything else from the request.
      data: {
        email: input.email,
        password: input.password,
        name: input.name,
        consent,
      },
      overrideAccess: true,
      depth: 0,
    })
  } catch (error) {
    // No e-mail address in the log (personal data, CLAUDE.md).
    log.error({ ...errorFields(error) }, 'customer registration failed')
    return json({ error: 'unavailable' }, 503)
  }
  return json({ ok: true }, 201)
}
