import { describe, expect, it } from 'vitest'

import { averageMargin, countByDay, lastDays } from './series'

describe('lastDays', () => {
  it('30 Polish days ending today, oldest first', () => {
    // 31.10.2026 00:30 Polish time = 30.10 23:30 UTC.
    const days = lastDays(new Date('2026-10-30T23:30:00Z'))
    expect(days).toHaveLength(30)
    expect(days.at(-1)).toBe('2026-10-31')
    expect(days[0]).toBe('2026-10-02')
  })

  it('crosses a month', () => {
    expect(lastDays(new Date('2026-11-02T10:00:00Z'), 3)).toEqual([
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
  })
})

describe('countByDay', () => {
  it('counts per Polish day and ignores days outside', () => {
    const days = ['2026-10-30', '2026-10-31']
    expect(
      countByDay(
        [
          '2026-10-30T08:00:00Z',
          '2026-10-30T23:10:00Z', // 31.10 00:10 Polish time
          '2026-10-31T12:00:00Z',
          '2026-09-01T12:00:00Z',
        ],
        days,
      ),
    ).toEqual([1, 2])
  })
})

describe('averageMargin', () => {
  it('mean of the known margins', () => {
    expect(averageMargin([0.1, 0.12, null, Number.NaN])).toBeCloseTo(0.11, 9)
    expect(averageMargin([null])).toBeNull()
    expect(averageMargin([])).toBeNull()
  })
})
