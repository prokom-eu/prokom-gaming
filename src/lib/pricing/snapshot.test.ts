import { describe, expect, it } from 'vitest'

import {
  ceil10,
  ceilTo,
  priceFromSnapshot,
  snapshotFromRows,
  surcharge,
  type PriceList,
  type PublishedPriceRow,
} from './snapshot'

describe('ceil10 (ADR-G002 §8.6)', () => {
  it('rounds up to the next 10 zł', () => {
    expect(ceil10(4271)).toBe(4280)
    expect(ceil10(4270.01)).toBe(4280)
    expect(ceil10(4270)).toBe(4270)
    expect(ceil10(0)).toBe(0)
  })

  it('ignores binary floating-point noise instead of adding a whole step', () => {
    const noisy = 0.1 * 3 * 100 // 30.000000000000004
    expect(noisy).not.toBe(30)
    expect(Math.ceil(noisy / 10) * 10).toBe(40) // the naive formula is off by 10 zł
    expect(ceil10(noisy)).toBe(30)
  })

  it('supports other steps and rejects a non-positive one', () => {
    expect(ceilTo(101, 50)).toBe(150)
    expect(() => ceilTo(10, 0)).toThrow()
  })
})

const prices: PriceList = {
  level: { P01: 3000 },
  option: { CASE: 300, COOL: 100, R16: 400, R32: 900, SSD: 200 },
  service: 180,
}
const config = { level: 'P01', case: 'CASE', cooler: 'COOL', ram: 'R16', ssd: 'SSD' }

describe('priceFromSnapshot', () => {
  it('is the plain sum of item prices and the service', () => {
    expect(priceFromSnapshot(config, prices)).toBe(3000 + 300 + 100 + 400 + 200 + 180)
  })

  it('returns null for an unknown code', () => {
    expect(priceFromSnapshot({ ...config, ram: 'NOPE' }, prices)).toBeNull()
    expect(priceFromSnapshot({ ...config, level: 'P99' }, prices)).toBeNull()
  })

  it('treats built-in object keys from a URL as unknown codes, not prices', () => {
    for (const code of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(priceFromSnapshot({ ...config, ram: code }, prices), code).toBeNull()
      expect(priceFromSnapshot({ ...config, level: code }, prices), code).toBeNull()
      expect(surcharge(prices, 'R16', code), code).toBeNull()
      expect(surcharge(prices, code, 'R16'), code).toBeNull()
    }
  })

  it('surcharge = difference of option prices, the same as the price difference', () => {
    expect(surcharge(prices, 'R16', 'R32')).toBe(500)
    expect(surcharge(prices, 'R32', 'R16')).toBe(-500)
    expect(surcharge(prices, 'R16', 'NOPE')).toBeNull()
    const swapped = priceFromSnapshot({ ...config, ram: 'R32' }, prices)!
    expect(swapped - priceFromSnapshot(config, prices)!).toBe(500)
  })
})

describe('snapshotFromRows', () => {
  const row = (r: Partial<PublishedPriceRow>): PublishedPriceRow => ({
    batch: 2,
    itemType: 'option',
    itemCode: 'X',
    sellPrice: 1,
    publishedAt: '2026-10-25T12:00:00.000Z',
    ...r,
  })

  it('groups rows by type', () => {
    const snap = snapshotFromRows([
      row({ itemType: 'level', itemCode: 'P01', sellPrice: 3000 }),
      row({ itemType: 'option', itemCode: 'R16', sellPrice: 400 }),
      row({ itemType: 'service', itemCode: 'SERVICE', sellPrice: 180 }),
      row({ itemType: 'level_from', itemCode: 'P01', sellPrice: 4960 }),
    ])
    expect(snap).toEqual({
      batch: 2,
      publishedAt: '2026-10-25T12:00:00.000Z',
      level: { P01: 3000 },
      option: { R16: 400 },
      service: 180,
      levelFrom: { P01: 4960 },
    })
  })

  it('rejects an empty list, mixed batches and a batch without the service', () => {
    expect(() => snapshotFromRows([])).toThrow()
    expect(() =>
      snapshotFromRows([row({ itemType: 'service' }), row({ batch: 3, itemType: 'service' })]),
    ).toThrow(/Mixed/)
    expect(() => snapshotFromRows([row({})])).toThrow(/service/)
  })
})
