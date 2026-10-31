import { describe, expect, it } from 'vitest'

import {
  initials,
  maskEmail,
  parseFilter,
  preview,
  sortInbox,
  statusesOf,
  whenLabel,
} from './format'

describe('filters', () => {
  it('reads the filter from the address, unknown = all', () => {
    expect(parseFilter('nowe')).toBe('nowe')
    expect(parseFilter('x')).toBe('wszystkie')
    expect(parseFilter(undefined)).toBe('wszystkie')
  })

  it('„W toku” covers offers too, „Zamknięte” the three ends', () => {
    expect(statusesOf('w-toku')).toEqual(['in_progress', 'offer_sent'])
    expect(statusesOf('zamkniete')).toEqual(['won', 'lost', 'closed'])
    expect(statusesOf('wszystkie')).toBeNull()
  })
})

describe('sortInbox', () => {
  it('new first, longest waiting on top; then the latest activity', () => {
    const rows = [
      {
        id: 1,
        status: 'in_progress' as const,
        createdAt: '2026-11-01T08:00:00Z',
        lastActivityAt: '2026-11-02T10:00:00Z',
      },
      { id: 2, status: 'new' as const, createdAt: '2026-11-02T09:00:00Z' },
      { id: 3, status: 'closed' as const, createdAt: '2026-11-02T11:00:00Z' },
      { id: 4, status: 'new' as const, createdAt: '2026-11-02T08:00:00Z' },
    ]
    expect(sortInbox(rows).map((r) => r.id)).toEqual([4, 2, 3, 1])
  })
})

describe('whenLabel', () => {
  const now = new Date('2026-11-02T20:00:00Z') // 21:00 in Warsaw
  it('today, yesterday, older — Polish time', () => {
    expect(whenLabel('2026-11-02T18:42:00Z', now)).toBe('dziś 19:42')
    expect(whenLabel('2026-11-01T20:03:00Z', now)).toBe('wczoraj 21:03')
    expect(whenLabel('2026-10-28T19:15:00Z', now)).toBe('28.10, 20:15')
  })
  it('just after midnight in Warsaw is already today', () => {
    expect(whenLabel('2026-11-02T23:30:00Z', new Date('2026-11-03T06:00:00Z'))).toBe('dziś 00:30')
  })
})

describe('initials, maskEmail, preview', () => {
  it('initials of up to two words', () => {
    expect(initials('Michał W.')).toBe('MW')
    expect(initials('  anna ')).toBe('A')
    expect(initials('')).toBe('?')
  })

  it('half-hidden address', () => {
    expect(maskEmail('michal.wisniewski@gmail.com')).toBe('michal.w…@gmail.com')
    expect(maskEmail('jan@wp.pl')).toBe('jan@wp.pl')
  })

  it('one line, cut', () => {
    expect(preview('Dzień\n dobry,  interesuje')).toBe('Dzień dobry, interesuje')
    expect(preview('a'.repeat(100), 10)).toBe(`${'a'.repeat(9)}…`)
    expect(preview(null)).toBe('')
  })
})
