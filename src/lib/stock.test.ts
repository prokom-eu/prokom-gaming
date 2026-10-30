import { describe, expect, it } from 'vitest'

import { isReserved, locationOf, RESERVATION_MS, stockPrice } from './stock'

const now = Date.parse('2026-11-20T10:00:00Z')

describe('isReserved', () => {
  it('holds while the date is in the future', () => {
    expect(isReserved(new Date(now + 1000).toISOString(), now)).toBe(true)
    expect(isReserved(new Date(now - 1000).toISOString(), now)).toBe(false)
    expect(isReserved(null, now)).toBe(false)
    expect(isReserved('nie-data', now)).toBe(false)
  })

  it('a reservation lasts 24 hours', () => {
    expect(RESERVATION_MS).toBe(86_400_000)
  })
})

describe('stockPrice', () => {
  it('is the configuration price minus the discount', () => {
    expect(stockPrice(11_930, 500)).toBe(11_430)
    expect(stockPrice(11_930, null)).toBe(11_930)
    expect(stockPrice(11_930, -100)).toBe(11_930)
    expect(stockPrice(1000, 1000)).toBeNull()
  })
})

describe('locationOf', () => {
  it('gives the badge of the board', () => {
    expect(locationOf('zakopane')?.badge).toBe('odbiór od ręki')
    expect(locationOf('x')).toBeUndefined()
  })
})
