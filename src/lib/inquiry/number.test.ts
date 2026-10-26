import { describe, expect, it, vi } from 'vitest'

import { formatInquiryNumber, nextInquirySeq, yearInPoland } from './number'

describe('formatInquiryNumber', () => {
  it('PKG-RRRR-NNNN with four digits at least', () => {
    expect(formatInquiryNumber(2026, 1)).toBe('PKG-2026-0001')
    expect(formatInquiryNumber(2026, 42)).toBe('PKG-2026-0042')
    expect(formatInquiryNumber(2027, 9999)).toBe('PKG-2027-9999')
  })

  it('never cuts a number past 9999', () => {
    expect(formatInquiryNumber(2026, 12345)).toBe('PKG-2026-12345')
  })

  it('rejects a sequence that is not a positive integer', () => {
    expect(() => formatInquiryNumber(2026, 0)).toThrow()
    expect(() => formatInquiryNumber(2026, 1.5)).toThrow()
  })
})

describe('yearInPoland', () => {
  it('uses the Polish calendar year, not UTC', () => {
    // 31.12.2026 23:30 UTC = 1.01.2027 00:30 in Warsaw.
    expect(yearInPoland(new Date('2026-12-31T23:30:00Z'))).toBe(2027)
    expect(yearInPoland(new Date('2026-12-31T22:30:00Z'))).toBe(2026)
  })
})

describe('nextInquirySeq', () => {
  const adapterWith = (rows: unknown[]) => {
    const execute = vi.fn().mockResolvedValue({ rows })
    return { execute, adapter: { drizzle: { execute }, sessions: {} } }
  }

  it('returns the counter value of the upsert', async () => {
    const { adapter, execute } = adapterWith([{ last: 7 }])
    const req = { payload: { db: adapter } } as never
    await expect(nextInquirySeq(req, 2026)).resolves.toBe(7)
    expect(execute).toHaveBeenCalledOnce()
  })

  it('runs in the transaction of the request when there is one', async () => {
    const inTransaction = vi.fn().mockResolvedValue({ rows: [{ last: 3 }] })
    const outside = vi.fn()
    const req = {
      transactionID: Promise.resolve('tx1'),
      payload: {
        db: {
          drizzle: { execute: outside },
          sessions: { tx1: { db: { execute: inTransaction } } },
        },
      },
    } as never
    await expect(nextInquirySeq(req, 2026)).resolves.toBe(3)
    expect(inTransaction).toHaveBeenCalledOnce()
    expect(outside).not.toHaveBeenCalled()
  })

  it('fails loudly when the counter returns nothing', async () => {
    const { adapter } = adapterWith([])
    await expect(nextInquirySeq({ payload: { db: adapter } } as never, 2026)).rejects.toThrow()
  })
})
