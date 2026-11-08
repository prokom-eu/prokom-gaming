import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { isAdmin, isCustomer, isPanelUser } from './panel'

const reqAs = (user: unknown) => ({ user }) as Pick<PayloadRequest, 'user'>

const admin = { id: 1, collection: 'users', role: 'admin' }
const serwis = { id: 2, collection: 'users', role: 'serwis' }
const noRole = { id: 3, collection: 'users' }
const customer = { id: 1, collection: 'customers', role: 'admin' }

describe('isPanelUser', () => {
  it('lets in panel staff of any role', () => {
    expect(isPanelUser(reqAs(admin))).toBe(true)
    expect(isPanelUser(reqAs(serwis))).toBe(true)
  })

  it('keeps out customers signed in to their account', () => {
    expect(isPanelUser(reqAs(customer))).toBe(false)
  })

  it('keeps out anonymous visitors', () => {
    expect(isPanelUser(reqAs(null))).toBe(false)
  })
})

describe('isAdmin', () => {
  it('lets in only the admin role', () => {
    expect(isAdmin(reqAs(admin))).toBe(true)
    expect(isAdmin(reqAs(serwis))).toBe(false)
  })

  it('does not treat a staff account without a role as admin', () => {
    expect(isAdmin(reqAs(noRole))).toBe(false)
  })

  it('never lets in a customer, even with a forged role value', () => {
    expect(isAdmin(reqAs(customer))).toBe(false)
  })

  it('keeps out anonymous visitors', () => {
    expect(isAdmin(reqAs(null))).toBe(false)
  })
})

describe('isCustomer', () => {
  it('recognises only the customers collection', () => {
    expect(isCustomer(reqAs({ id: 1, collection: 'customers' }))).toBe(true)
    expect(isCustomer(reqAs(admin))).toBe(false)
    expect(isCustomer(reqAs(null))).toBe(false)
  })
})
