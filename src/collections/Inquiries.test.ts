import { describe, expect, it, vi } from 'vitest'

import { RETENTION_CONTEXT } from '../lib/inquiry/retention'
import { recordDeletion } from './Inquiries'

const admin = { id: 3, email: 'admin@example.test', collection: 'users' }

function run(context: Record<string, unknown>, user: unknown) {
  const create = vi.fn()
  const req = { user, payload: { create } }
  return recordDeletion({
    context,
    doc: { id: 12, number: 'PKG-2026-0012', name: 'Jan', email: 'jan@example.test' },
    req,
  } as never).then(() => create.mock.calls[0]?.[0]?.data)
}

describe('inquiry deletion trail', () => {
  it('panel erasure: reason request, who deleted, no content', async () => {
    const data = await run({}, admin)
    expect(data).toEqual({
      inquiryId: 12,
      number: 'PKG-2026-0012',
      reason: 'request',
      deletedBy: 3,
      deletedByEmail: 'admin@example.test',
    })
  })

  it('retention job: reason retention even when a panel account runs the queue', async () => {
    const data = await run({ [RETENTION_CONTEXT]: true }, admin)
    expect(data).toMatchObject({ reason: 'retention', deletedBy: null, deletedByEmail: null })
  })

  it('a customer account (G14) is never recorded as the deleting user', async () => {
    const data = await run({}, { id: 9, email: 'klient@example.test', collection: 'customers' })
    expect(data).toMatchObject({ reason: 'request', deletedBy: null, deletedByEmail: null })
  })
})
