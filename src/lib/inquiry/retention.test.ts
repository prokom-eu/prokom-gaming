import { describe, expect, it, vi } from 'vitest'

import { deleteExpiredInquiries, isExpired, retentionCutoff } from './retention'
import { nextStatusChangedAt } from './status'

describe('retentionCutoff', () => {
  it('subtracts whole months', () => {
    expect(retentionCutoff(new Date('2028-10-27T03:00:00Z'), 24).toISOString()).toBe(
      '2026-10-27T03:00:00.000Z',
    )
  })

  it('clamps to the last day of a shorter month', () => {
    expect(retentionCutoff(new Date('2027-03-31T00:00:00Z'), 1).toISOString()).toBe(
      '2027-02-28T00:00:00.000Z',
    )
  })
})

describe('isExpired', () => {
  const cutoff = new Date('2026-10-27T00:00:00Z')
  const before = '2026-10-26T23:59:59Z'

  it('deletes only lost and closed inquiries older than the cutoff', () => {
    expect(isExpired({ status: 'lost', statusChangedAt: before }, cutoff)).toBe(true)
    expect(isExpired({ status: 'closed', statusChangedAt: before }, cutoff)).toBe(true)
    expect(isExpired({ status: 'closed', statusChangedAt: '2026-10-27T00:00:01Z' }, cutoff)).toBe(
      false,
    )
  })

  it('never deletes open or won inquiries, however old', () => {
    for (const status of ['new', 'in_progress', 'offer_sent', 'won'] as const) {
      expect(isExpired({ status, statusChangedAt: '2000-01-01T00:00:00Z' }, cutoff)).toBe(false)
    }
  })

  it('keeps a record without a status-change date', () => {
    expect(isExpired({ status: 'closed', statusChangedAt: null }, cutoff)).toBe(false)
  })
})

describe('deleteExpiredInquiries', () => {
  it('asks for lost/closed before the cutoff and deletes what the rule allows', async () => {
    const findCandidates = vi.fn().mockResolvedValue([
      { id: 1, status: 'closed', statusChangedAt: '2020-01-01T00:00:00Z' },
      // A database filter is coarse on purpose; the rule still decides.
      { id: 2, status: 'won', statusChangedAt: '2020-01-01T00:00:00Z' },
      { id: 3, status: 'lost', statusChangedAt: '2020-01-01T00:00:00Z' },
    ])
    const remove = vi.fn().mockResolvedValue(2)
    const result = await deleteExpiredInquiries({
      now: new Date('2026-10-27T03:00:00Z'),
      months: 24,
      findCandidates,
      remove,
    })
    expect(findCandidates).toHaveBeenCalledWith(
      ['lost', 'closed'],
      new Date('2024-10-27T03:00:00Z'),
    )
    expect(remove).toHaveBeenCalledWith([1, 3])
    expect(result).toEqual({ deleted: 2 })
  })

  it('does not call delete when nothing expired', async () => {
    const remove = vi.fn()
    const result = await deleteExpiredInquiries({
      now: new Date(),
      months: 24,
      findCandidates: async () => [],
      remove,
    })
    expect(remove).not.toHaveBeenCalled()
    expect(result).toEqual({ deleted: 0 })
  })
})

describe('nextStatusChangedAt', () => {
  const now = new Date('2026-10-27T12:00:00Z')
  const earlier = '2026-10-01T08:00:00.000Z'

  it('is set on create', () => {
    expect(nextStatusChangedAt({ operation: 'create', status: 'new', now })).toBe(now.toISOString())
  })

  it('moves only when the status really changes', () => {
    const base = { operation: 'update' as const, previousChangedAt: earlier, now }
    expect(nextStatusChangedAt({ ...base, status: 'closed', previousStatus: 'new' })).toBe(
      now.toISOString(),
    )
    expect(nextStatusChangedAt({ ...base, status: 'new', previousStatus: 'new' })).toBe(earlier)
    expect(nextStatusChangedAt({ ...base, status: undefined, previousStatus: 'new' })).toBe(earlier)
  })

  it('fills a missing date on update', () => {
    expect(
      nextStatusChangedAt({ operation: 'update', status: 'new', previousStatus: 'new', now }),
    ).toBe(now.toISOString())
  })
})
