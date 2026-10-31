import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { panelAccess } from './access'

const reqAs = (user: unknown) => ({ user }) as Pick<PayloadRequest, 'user'>

const admin = { id: 1, collection: 'users', role: 'admin' }
const serwis = { id: 2, collection: 'users', role: 'serwis' }
const noRole = { id: 3, collection: 'users' }
const customer = { id: 1, collection: 'customers', role: 'admin' }

describe('panelAccess', () => {
  it('lets the admin into admin and staff views', () => {
    expect(panelAccess(reqAs(admin), 'admin')).toEqual({ ok: true })
    expect(panelAccess(reqAs(admin), 'staff')).toEqual({ ok: true })
  })

  it('lets serwis into staff views only', () => {
    expect(panelAccess(reqAs(serwis), 'staff')).toEqual({ ok: true })
    expect(panelAccess(reqAs(serwis), 'admin')).toEqual({ ok: false, reason: 'role' })
  })

  it('treats a staff account without a role as not an admin', () => {
    expect(panelAccess(reqAs(noRole), 'admin')).toEqual({ ok: false, reason: 'role' })
  })

  it('sends anonymous visitors and customers to the panel login', () => {
    expect(panelAccess(reqAs(null), 'staff')).toEqual({ ok: false, reason: 'anon' })
    expect(panelAccess(reqAs(customer), 'admin')).toEqual({ ok: false, reason: 'anon' })
    expect(panelAccess(reqAs(customer), 'staff')).toEqual({ ok: false, reason: 'anon' })
  })
})
