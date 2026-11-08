import { describe, expect, it } from 'vitest'

import { previousWeek } from './model'
import { isWeeklyDue, weeklyReportText, type WeeklyData } from './weeklyText'

describe('weekly report: when (P8)', () => {
  // 2 November 2026 is a Monday; CET = UTC+1.
  it('Monday from 07:00 Polish time, once that day', () => {
    expect(isWeeklyDue(new Date('2026-11-02T05:59:00Z'), null)).toBe(false) // 06:59
    expect(isWeeklyDue(new Date('2026-11-02T06:00:00Z'), null)).toBe(true) // 07:00
    expect(isWeeklyDue(new Date('2026-11-02T15:00:00Z'), null)).toBe(true) // late server
    expect(isWeeklyDue(new Date('2026-11-02T08:00:00Z'), '2026-11-02T06:05:00Z')).toBe(false)
    expect(isWeeklyDue(new Date('2026-11-02T06:05:00Z'), '2026-10-26T06:05:00Z')).toBe(true)
    expect(isWeeklyDue(new Date('2026-11-03T06:05:00Z'), null)).toBe(false) // Tuesday
  })

  it('covers Monday to Sunday of the past week', () => {
    const week = previousWeek(new Date('2026-11-02T06:05:00Z'))
    expect(week.dayKeys[0]).toBe('2026-10-26')
    expect(week.dayKeys.at(-1)).toBe('2026-11-01')
    expect(new Date(week.endAt).toISOString()).toBe('2026-11-01T23:00:00.000Z')
  })
})

describe('weekly report: text', () => {
  const data: WeeklyData = {
    from: '2026-10-26',
    to: '2026-11-01',
    traffic: { visitors: 1234, conversion: 0.0165 },
    sales: { inquiries: 20, offered: 12, orders: 3, revenue: 27_600 },
    prices: { average: 0.128, lowest: 0.105, minMargin: 0.11, queue: 4 },
    statsUrl: 'https://prokomgaming.pl/admin/statystyki?okres=7',
  }

  it('says the week, traffic, sales and margins in numbers', () => {
    const { subject, text } = weeklyReportText(data)
    expect(subject).toBe('Raport tygodniowy · 26.10–1.11.2026')
    expect(text).toContain('odwiedzający: 1 234')
    expect(text).toContain('konwersja na zapytania: 1,65%')
    expect(text).toContain('przychód: 27 600 zł')
    expect(text).toContain(
      'najniższa marża w konfiguratorze: 10,5% (minimum 11%) — poniżej minimum',
    )
    expect(text).toContain('do zatwierdzenia: 4')
    expect(text).toContain('https://prokomgaming.pl/admin/statystyki?okres=7')
  })

  it('leaves out switched-off parts and says when a source is missing', () => {
    const off = weeklyReportText({ ...data, traffic: 'off', prices: 'off' }).text
    expect(off).not.toContain('Ruch na stronie')
    expect(off).not.toContain('Ceny i marże')
    expect(off).toContain('Sprzedaż')
    const missing = weeklyReportText({ ...data, traffic: 'missing', prices: 'missing' }).text
    expect(missing).toContain('statystyki ruchu nie odpowiedziały')
    expect(missing).toContain('nie udało się policzyć marż')
  })
})
