import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { ACCOUNT_VERIFICATION_CONTEXT, verifyAndStartPasswordSetup } from './verify.server'

const TOKEN = 'a'.repeat(40)

type Mocks = Record<'find' | 'verifyEmail' | 'update' | 'forgotPassword', ReturnType<typeof vi.fn>>

function fakePayload(over: Partial<Mocks> = {}): Mocks & { asPayload: Payload } {
  const mocks: Mocks = {
    find: vi.fn().mockResolvedValue({ docs: [{ id: 7, email: 'ola@example.com' }] }),
    verifyEmail: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue({}),
    forgotPassword: vi.fn().mockResolvedValue('r'.repeat(40)),
    ...over,
  }
  return { ...mocks, asPayload: mocks as unknown as Payload }
}

describe('verifyAndStartPasswordSetup (audit AB4, G-01)', () => {
  it('rejects malformed tokens without touching the database', async () => {
    const payload = fakePayload()
    expect(await verifyAndStartPasswordSetup(payload.asPayload, 'nope')).toEqual({ ok: false })
    expect(payload.find).not.toHaveBeenCalled()
  })

  it('unknown token: not verified', async () => {
    const payload = fakePayload({ find: vi.fn().mockResolvedValue({ docs: [] }) })
    expect(await verifyAndStartPasswordSetup(payload.asPayload, TOKEN)).toEqual({ ok: false })
    expect(payload.verifyEmail).not.toHaveBeenCalled()
  })

  it('after verification the sign-up password stops working and a reset token is issued', async () => {
    const payload = fakePayload()
    const result = await verifyAndStartPasswordSetup(payload.asPayload, TOKEN)

    expect(result).toEqual({ ok: true, resetToken: 'r'.repeat(40) })
    expect(payload.verifyEmail).toHaveBeenCalledWith({ collection: 'customers', token: TOKEN })
    const update = payload.update.mock.calls[0][0] as {
      id: number
      data: { password: string }
      overrideAccess: boolean
    }
    expect(update.id).toBe(7)
    expect(update.overrideAccess).toBe(true)
    expect(update.data.password.length).toBeGreaterThanOrEqual(40) // random, nobody knows it
    expect(payload.forgotPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'customers',
        data: { email: 'ola@example.com' },
        disableEmail: true,
        context: ACCOUNT_VERIFICATION_CONTEXT,
      }),
    )
  })

  it('verification failure (used link): nothing else happens', async () => {
    const payload = fakePayload({ verifyEmail: vi.fn().mockRejectedValue(new Error('used')) })
    expect(await verifyAndStartPasswordSetup(payload.asPayload, TOKEN)).toEqual({ ok: false })
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('verified, but the reset token could not be issued: still verified, no token', async () => {
    const payload = fakePayload({ forgotPassword: vi.fn().mockRejectedValue(new Error('down')) })
    expect(await verifyAndStartPasswordSetup(payload.asPayload, TOKEN)).toEqual({
      ok: true,
      resetToken: null,
    })
  })
})
