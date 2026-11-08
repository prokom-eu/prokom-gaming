import { describe, expect, it } from 'vitest'

import { minutesInReplyHours, slaTone, waitLabel } from './sla'

describe('minutesInReplyHours', () => {
  it('counts plain minutes during the day (winter, UTC+1)', () => {
    // 19:08 → 19:42 Polish time.
    expect(minutesInReplyHours('2026-11-02T18:08:00Z', '2026-11-02T18:42:00Z')).toBe(34)
  })

  it('skips the night: sent at 23:00, now 8:45 → 45 min', () => {
    expect(minutesInReplyHours('2026-11-02T22:00:00Z', '2026-11-03T07:45:00Z')).toBe(45)
  })

  it('counts only up to 22:00 and from 8:00 the next day', () => {
    // 21:30 → next day 8:30 = 30 + 30.
    expect(minutesInReplyHours('2026-11-02T20:30:00Z', '2026-11-03T07:30:00Z')).toBe(60)
  })

  it('uses summer time (UTC+2)', () => {
    // 7:30 → 8:20 Polish time in July = 20 minutes after opening.
    expect(minutesInReplyHours('2026-07-01T05:30:00Z', '2026-07-01T06:20:00Z')).toBe(20)
  })

  it('crosses the change to winter time', () => {
    // Change on 25.10.2026: 24.10 21:00 (UTC+2) → 26.10 9:00 (UTC+1) = 60 + 14 h + 60.
    expect(minutesInReplyHours('2026-10-24T19:00:00Z', '2026-10-26T08:00:00Z')).toBe(960)
  })

  it('a full day counts 14 hours', () => {
    expect(minutesInReplyHours('2026-11-02T23:00:00Z', '2026-11-03T23:00:00Z')).toBe(14 * 60)
  })

  it('honours other hours and nonsense input', () => {
    expect(
      minutesInReplyHours('2026-11-02T06:00:00Z', '2026-11-02T09:00:00Z', { from: 9, to: 17 }),
    ).toBe(60)
    expect(minutesInReplyHours('2026-11-02T10:00:00Z', '2026-11-02T09:00:00Z')).toBe(0)
    expect(
      minutesInReplyHours('2026-11-02T10:00:00Z', '2026-11-02T12:00:00Z', { from: 22, to: 8 }),
    ).toBe(0)
  })
})

describe('slaTone', () => {
  it('orange before the limit, red from it', () => {
    expect(slaTone(34, 60)).toBe('warn')
    expect(slaTone(60, 60)).toBe('bad')
  })
})

describe('waitLabel', () => {
  it('minutes, hours, days', () => {
    expect(waitLabel(34)).toBe('34 min')
    expect(waitLabel(81)).toBe('1 h 21 min')
    expect(waitLabel(120)).toBe('2 h')
    expect(waitLabel(60 * 50)).toBe('2 dni')
  })
})
