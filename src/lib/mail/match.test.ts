import { describe, expect, it } from 'vitest'

import { decideMatch, numberIn } from './match'

describe('numberIn', () => {
  it('finds the inquiry number in a reply subject, any case', () => {
    expect(numberIn('Re: [PKG-2026-0047] Wampir')).toBe('PKG-2026-0047')
    expect(numberIn('odp: pkg-2026-0047')).toBe('PKG-2026-0047')
    expect(numberIn('Re: [PKG-2027-12345] Bies')).toBe('PKG-2027-12345')
  })

  it('ignores look-alikes', () => {
    expect(numberIn('Re: Twoje zapytanie')).toBeNull()
    expect(numberIn('XPKG-2026-0047')).toBeNull()
    expect(numberIn('PKG-26-0047')).toBeNull()
    expect(numberIn('PKG-2026-047')).toBeNull()
  })
})

describe('decideMatch (ADR-G008 pt 3)', () => {
  const thread = { id: 7, email: 'klient@example.com' }
  const other = { id: 9, email: 'ktos@example.com' }

  it('the number in the subject wins over the references', () => {
    expect(decideMatch('klient@example.com', { byNumber: thread, byReference: other })).toEqual({
      inquiryId: 7,
      by: 'number',
      otherSender: null,
    })
  })

  it('falls back to In-Reply-To / References', () => {
    expect(decideMatch('klient@example.com', { byNumber: null, byReference: thread })).toEqual({
      inquiryId: 7,
      by: 'reference',
      otherSender: null,
    })
  })

  it('nothing found → unmatched', () => {
    expect(decideMatch('klient@example.com', { byNumber: null, byReference: null })).toBeNull()
  })

  it('a different sender is attached, but marked', () => {
    expect(decideMatch('Zona@Example.com', { byNumber: thread, byReference: null })).toEqual({
      inquiryId: 7,
      by: 'number',
      otherSender: 'zona@example.com',
    })
  })
})
