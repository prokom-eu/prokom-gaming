import { describe, expect, it } from 'vitest'

import { assertSeedAllowed, parseSeedEnv } from './config'

describe('assertSeedAllowed', () => {
  it('blocks seeding in production', () => {
    expect(() => assertSeedAllowed('production')).toThrow(/production/)
  })

  it('allows development, test and an unset NODE_ENV', () => {
    expect(() => assertSeedAllowed('development')).not.toThrow()
    expect(() => assertSeedAllowed('test')).not.toThrow()
    expect(() => assertSeedAllowed(undefined)).not.toThrow()
  })
})

describe('parseSeedEnv', () => {
  it('reads the local admin credentials', () => {
    expect(
      parseSeedEnv({
        SEED_ADMIN_EMAIL: 'admin@example.test',
        SEED_ADMIN_PASSWORD: 'x'.repeat(12),
      }),
    ).toEqual({ adminEmail: 'admin@example.test', adminPassword: 'x'.repeat(12) })
  })

  it('fails without leaking values when variables are missing or invalid', () => {
    const secret = 'short'
    let message = ''
    try {
      parseSeedEnv({ SEED_ADMIN_EMAIL: 'not-an-email', SEED_ADMIN_PASSWORD: secret })
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toMatch(/SEED_ADMIN_EMAIL/)
    expect(message).toMatch(/SEED_ADMIN_PASSWORD/)
    expect(message).not.toContain(secret)
    expect(message).not.toContain('not-an-email')
  })
})
