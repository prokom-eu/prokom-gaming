import { describe, expect, it } from 'vitest'

import { intakeStatus } from './intakeStatus'

const NOW = new Date('2026-11-02T18:45:00Z')

describe('intakeStatus (Settings → Zapytania i poczta)', () => {
  it('without IMAP_* says reading is off', () => {
    expect(intakeStatus(false, {}, NOW)).toMatchObject({
      value: 'odbiór wyłączony — brak ustawień IMAP',
      tone: 'mu',
    })
  })

  it('on: the board line and the last good read', () => {
    expect(intakeStatus(true, { lastOkAt: '2026-11-02T18:44:00Z', errorCount: 0 }, NOW)).toEqual({
      value: 'pobierane co 2 min (IMAP)',
      note: 'ostatni udany odczyt: dziś 19:44',
      tone: 'ok',
    })
    expect(intakeStatus(true, {}, NOW).note).toBe('pierwszy odczyt w ciągu 2 minut')
  })

  it('no good read for over 10 minutes shows in red (a stuck job counts no errors)', () => {
    expect(intakeStatus(true, { lastOkAt: '2026-11-02T18:30:00Z', errorCount: 0 }, NOW)).toEqual({
      value: 'pobierane co 2 min (IMAP)',
      note: 'brak odczytu od ponad 10 min · ostatni udany odczyt: dziś 19:30',
      tone: 'bad',
    })
  })

  it('errors in a row show in red', () => {
    expect(intakeStatus(true, { lastOkAt: '2026-11-02T18:30:00Z', errorCount: 3 }, NOW)).toEqual({
      value: 'pobierane co 2 min (IMAP)',
      note: 'błąd odczytu skrzynki (3 z rzędu) · ostatni udany odczyt: dziś 19:30',
      tone: 'bad',
    })
  })
})
