import { describe, expect, it, vi } from 'vitest'

import { releaseStuckJobs } from './releaseStuck'

vi.mock('@/lib/logger', () => ({ log: { warn: vi.fn(), error: vi.fn() } }))

type UpdateArgs = { collection: string; where: unknown; data: unknown; overrideAccess: boolean }

function fakePayload(docs: unknown[], errors: unknown[] = []) {
  const update = vi.fn(async (_args: UpdateArgs) => ({ docs, errors }))
  return { payload: { update } as never, update }
}

describe('releaseStuckJobs (G16, STAN P4)', () => {
  it('clears `processing` on every job left processing, bypassing access', async () => {
    const { payload, update } = fakePayload([{ id: 1 }, { id: 2 }])
    await expect(releaseStuckJobs(payload)).resolves.toBe(2)
    expect(update).toHaveBeenCalledTimes(1)
    const args = update.mock.calls[0]![0]
    expect(args.collection).toBe('payload-jobs')
    expect(args.where).toEqual({ processing: { equals: true } })
    expect(args.data).toEqual({ processing: false })
    expect(args.overrideAccess).toBe(true)
  })

  it('returns 0 when nothing was stuck', async () => {
    const { payload } = fakePayload([])
    await expect(releaseStuckJobs(payload)).resolves.toBe(0)
  })

  it('does not throw when some jobs could not be updated', async () => {
    const { payload } = fakePayload([{ id: 1 }], [{ id: 2, message: 'x' }])
    await expect(releaseStuckJobs(payload)).resolves.toBe(1)
  })
})
