import { describe, expect, it } from 'vitest'

import {
  biggestLoss,
  buildSlugOf,
  cumulative,
  deviceShares,
  fillDays,
  funnel,
  paidAt,
  periodOf,
  periodRange,
  shares,
  sourceLabel,
  sourceRows,
  warsawMidnight,
} from './model'

describe('period (P8)', () => {
  it('reads ?okres, 30 days by default', () => {
    expect(periodOf('7')).toBe(7)
    expect(periodOf('30')).toBe(30)
    expect(periodOf('90')).toBe(30)
    expect(periodOf(undefined)).toBe(30)
  })

  it('a Polish day starts at 00:00 Warsaw time, in winter and in summer', () => {
    expect(new Date(warsawMidnight('2026-11-02')).toISOString()).toBe('2026-11-01T23:00:00.000Z')
    expect(new Date(warsawMidnight('2026-07-15')).toISOString()).toBe('2026-07-14T22:00:00.000Z')
    // The day of the change to winter time starts in summer time.
    expect(new Date(warsawMidnight('2026-10-25')).toISOString()).toBe('2026-10-24T22:00:00.000Z')
  })

  it('7 days end today; the end is rounded down to 5 minutes', () => {
    const p = periodRange(new Date('2026-11-02T19:43:21Z'), 7)
    expect(p.dayKeys).toEqual([
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
    expect(new Date(p.startAt).toISOString()).toBe('2026-10-26T23:00:00.000Z')
    expect(new Date(p.endAt).toISOString()).toBe('2026-11-02T19:40:00.000Z')
  })

  it('fills missing days with 0 and adds up', () => {
    expect(fillDays([{ day: '2026-11-02', count: 5 }], ['2026-11-01', '2026-11-02'])).toEqual([
      0, 5,
    ])
    expect(cumulative([1, 0, 2])).toEqual([1, 1, 3])
  })
})

describe('revenue from payment (Krystian 02.11)', () => {
  it('the first entry in „Opłacone” or later is the payment', () => {
    expect(
      paidAt([
        { stage: 'offer', at: '2026-10-01T10:00:00Z' },
        { stage: 'paid', at: '2026-10-03T10:00:00Z' },
        { stage: 'assembly', at: '2026-10-05T10:00:00Z' },
      ]),
    ).toBe(Date.parse('2026-10-03T10:00:00Z'))
    // Moved past „Opłacone” in the form: counted from the first later stage.
    expect(paidAt([{ stage: 'parts', at: '2026-10-04T10:00:00Z' }])).toBe(
      Date.parse('2026-10-04T10:00:00Z'),
    )
    expect(paidAt([{ stage: 'offer', at: '2026-10-01T10:00:00Z' }])).toBeNull()
    expect(paidAt(null)).toBeNull()
  })
})

describe('funnel', () => {
  it('each step as a share of the previous one', () => {
    const steps = funnel([6775, 3116, 609, 112, 80, 9])
    expect(steps.map((s) => s.fromPrevious?.toFixed(3) ?? null)).toEqual([
      null,
      '0.460',
      '0.195',
      '0.184',
      '0.714',
      '0.113',
    ])
    // The board's numbers lose most between the offer and the order (11.2%).
    expect(biggestLoss(steps)).toBe(
      'Największa strata między ofertą a zamówieniem, tam warto szukać poprawek.',
    )
  })

  it('without Umami the database steps compare with each other only', () => {
    const steps = funnel([null, null, null, 112, 80, 9])
    expect(steps.map((s) => s.fromPrevious)).toEqual([null, null, null, null, 80 / 112, 9 / 80])
    expect(biggestLoss(funnel([null, null, null, 0, 0, 0]))).toBeNull()
  })
})

describe('shares', () => {
  it('top rows plus „Inne”, as parts of the total', () => {
    const rows = shares(
      [
        { label: 'Google (wyszukiwarka)', count: 40 },
        { label: 'Google (wyszukiwarka)', count: 4 },
        { label: 'Facebook', count: 12 },
      ],
      { limit: 1, total: 100 },
    )
    expect(rows).toEqual([
      { label: 'Google (wyszukiwarka)', share: 0.44 },
      { label: 'Inne', share: 0.56 },
    ])
    expect(shares([], { total: 0 })).toEqual([])
  })

  it('names sources like the board', () => {
    expect(sourceLabel('www.google.pl')).toBe('Google (wyszukiwarka)')
    expect(sourceLabel('l.facebook.com')).toBe('Facebook')
    expect(sourceLabel('m.youtube.com')).toBe('YouTube')
    expect(sourceLabel('forum.example.pl')).toBe('forum.example.pl')
    expect(
      sourceRows(
        [
          { name: 'direct', count: 19 },
          { name: 'organicSearch', count: 44 },
        ],
        [{ name: 'google.com', count: 44 }],
      ),
    ).toEqual([
      { label: 'Wejścia bezpośrednie', count: 19 },
      { label: 'Google (wyszukiwarka)', count: 44 },
    ])
  })

  it('devices: laptops and desktops are computers', () => {
    expect(
      deviceShares([
        { name: 'mobile', count: 68 },
        { name: 'laptop', count: 20 },
        { name: 'desktop', count: 9 },
        { name: 'tablet', count: 3 },
      ]),
    ).toEqual({ phone: 0.68, computer: 0.29, tablet: 0.03 })
    expect(deviceShares([])).toBeNull()
  })

  it('build pages by slug', () => {
    expect(buildSlugOf('/zestawy/wampir')).toBe('wampir')
    expect(buildSlugOf('/zestawy')).toBeNull()
  })
})
