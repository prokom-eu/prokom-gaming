import 'server-only'

import { randomBytes } from 'node:crypto'
import type { Payload } from 'payload'

/** Payload's tokens are 40 hex characters (`crypto.randomBytes(20)`); anything else is not one. */
const TOKEN = /^[a-f0-9]{40}$/

/** Marks Payload operations started by this flow (the per-IP reset limit skips them). */
export const ACCOUNT_VERIFICATION_CONTEXT = { accountVerification: true } as const

export type VerifyResult = { ok: false } | { ok: true; resetToken: string | null }

/**
 * Confirms the e-mail and hands the password to the mailbox owner (audit AB4, G-01).
 *
 * Whoever signs up chooses the password, but only the owner of the mailbox clicks the link — so a
 * stranger could sign up on someone's address and, once the owner confirmed it, log in with his
 * own password and see that person's orders. After verification the sign-up password is replaced
 * by a random one and the page continues to "set a password" with a fresh reset token.
 */
export async function verifyAndStartPasswordSetup(
  payload: Payload,
  token: string | undefined,
): Promise<VerifyResult> {
  if (!token || !TOKEN.test(token)) return { ok: false }
  try {
    const found = await payload.find({
      collection: 'customers',
      where: { _verificationToken: { equals: token } },
      select: { email: true },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const customer = found.docs[0] as { id: number | string; email?: string | null } | undefined
    if (!customer?.email) return { ok: false }

    // Password first: if this fails the account is still unverified and the link still works,
    // so it never ends up verified with the sign-up password.
    await payload.update({
      collection: 'customers',
      id: customer.id,
      data: { password: randomBytes(32).toString('base64url') },
      overrideAccess: true,
      depth: 0,
    })
    const verified = await payload.verifyEmail({ collection: 'customers', token })
    if (!verified) return { ok: false }
    try {
      const resetToken = await payload.forgotPassword({
        collection: 'customers',
        data: { email: customer.email },
        disableEmail: true,
        overrideAccess: true,
        context: ACCOUNT_VERIFICATION_CONTEXT,
      })
      return { ok: true, resetToken: resetToken || null }
    } catch {
      return { ok: true, resetToken: null }
    }
  } catch {
    // Unknown or used token: Payload throws — the page says so, nothing to log.
    return { ok: false }
  }
}
