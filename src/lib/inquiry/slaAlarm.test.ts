import { describe, expect, it } from 'vitest'

import { dueAlarms, slaAlarmEmail } from './slaAlarm'

const HOURS = { from: 8, to: 22 }
const now = new Date('2026-11-03T08:00:00Z') // 9:00 Polish time

describe('dueAlarms', () => {
  it('picks inquiries that waited the alarm time inside reply hours', () => {
    const due = dueAlarms(
      [
        // 8:10 → 50 min: due.
        { id: 1, number: 'PKG-2026-0001', topic: 'Wampir', createdAt: '2026-11-03T07:10:00Z' },
        // 8:30 → 30 min: not yet.
        { id: 2, number: 'PKG-2026-0002', topic: 'Skrzat', createdAt: '2026-11-03T07:30:00Z' },
        // 23:30 the day before → 60 min since 8:00: due.
        { id: 3, number: 'PKG-2026-0003', topic: 'Bon', createdAt: '2026-11-02T22:30:00Z' },
      ],
      now,
      HOURS,
      45,
    )
    expect(due.map((d) => [d.id, d.waited])).toEqual([
      [1, 50],
      [3, 60],
    ])
  })
})

describe('slaAlarmEmail', () => {
  it('number, topic and time only', () => {
    const mail = slaAlarmEmail(
      { id: 1, number: 'PKG-2026-0001', topic: 'Wampir', createdAt: '', waited: 50 },
      { panelUrl: 'http://x/admin/zapytania?nr=PKG-2026-0001' },
    )
    expect(mail.subject).toBe('Bez odpowiedzi od 50 min: PKG-2026-0001')
    expect(mail.text).toContain('PKG-2026-0001 (Wampir)')
    expect(mail.text).toContain('http://x/admin/zapytania?nr=PKG-2026-0001')
  })
})
