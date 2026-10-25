import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { isPanelUser } from './panel'

const reqAs = (user: unknown) => ({ user }) as Pick<PayloadRequest, 'user'>

describe('isPanelUser', () => {
  it('lets in panel staff', () => {
    expect(isPanelUser(reqAs({ id: 1, collection: 'users' }))).toBe(true)
  })

  it('keeps out customers signed in to their account (G14)', () => {
    expect(isPanelUser(reqAs({ id: 1, collection: 'customers' }))).toBe(false)
  })

  it('keeps out anonymous visitors', () => {
    expect(isPanelUser(reqAs(null))).toBe(false)
  })
})
