import { describe, expect, it } from 'vitest'

import { mailFieldOfPath, parseMailForm, toMailFormValues } from './mailForm'

const stored = {
  replyHours: { from: 8, to: 22 },
  replySlaMinutes: 60,
  replyAlarmMinutes: 45,
  signature: 'Krystian · PRO-KOM Gaming\nRabka-Zdrój',
}

describe('mail settings form', () => {
  it('round trip: what the form shows saves back the same', () => {
    expect(parseMailForm(toMailFormValues(stored))).toEqual({ ok: true, data: stored })
  })

  it('normalises line ends and trims the signature', () => {
    const result = parseMailForm({ ...toMailFormValues(stored), signature: '  A\r\nB  ' })
    expect(result.ok && result.data.signature).toBe('A\nB')
  })

  it('reports each wrong field', () => {
    const result = parseMailForm({
      from: '22',
      to: '8',
      replySlaMinutes: '1',
      replyAlarmMinutes: 'abc',
      signature: ' ',
    })
    expect(result).toEqual({
      ok: false,
      errors: {
        to: 'Godzina końca musi być późniejsza niż początku.',
        replySlaMinutes: 'Od 5 do 1440.',
        replyAlarmMinutes: 'Wpisz liczbę całkowitą.',
        signature: 'Wpisz podpis.',
      },
    })
  })

  it('maps Payload error paths', () => {
    expect(mailFieldOfPath('replyHours.to')).toBe('to')
    expect(mailFieldOfPath('signature')).toBe('signature')
    expect(mailFieldOfPath('other')).toBeUndefined()
  })
})
