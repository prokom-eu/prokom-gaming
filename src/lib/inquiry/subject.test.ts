import { describe, expect, it } from 'vitest'

import { inquiryTopic, replySubject } from './subject'

describe('inquiryTopic', () => {
  it('names the build, a changed build or a configuration', () => {
    expect(inquiryTopic({ type: 'build', buildName: 'Wampir' })).toBe('Wampir')
    expect(inquiryTopic({ type: 'config', buildName: 'Wampir' })).toBe('Wampir (zmieniony)')
    expect(inquiryTopic({ type: 'config', buildName: null })).toBe('Własna konfiguracja')
    expect(inquiryTopic({ type: 'compare' })).toBe('Własna konfiguracja')
    expect(inquiryTopic({ type: 'ready', buildName: 'Skrzat' })).toBe('Gotowy: Skrzat')
  })

  it('advice by budget, voucher by amount', () => {
    expect(inquiryTopic({ type: 'advice', budget: 'upto_6k' })).toBe('Dobór do 6 000 zł')
    expect(inquiryTopic({ type: 'advice', budget: '6k_9k' })).toBe('Dobór 6–9 tys. zł')
    expect(inquiryTopic({ type: 'advice', budget: 'unsure' })).toBe('Dobór zestawu')
    expect(inquiryTopic({ type: 'voucher', voucherAmount: 1000 })).toBe('Bon 1 000 zł')
  })

  it('falls back to the type name', () => {
    expect(inquiryTopic({ type: 'contact' })).toBe('Krótkie pytanie')
    expect(inquiryTopic({ type: 'custom_list' })).toBe('Mam własną listę')
    expect(inquiryTopic({ type: 'build', buildName: ' ' })).toBe('Gotowy zestaw')
  })
})

describe('replySubject', () => {
  it('Re: [number] topic, on one line', () => {
    expect(replySubject('PKG-2026-0047', 'Wampir')).toBe('Re: [PKG-2026-0047] Wampir')
    expect(replySubject('PKG-2026-0047', 'A\r\nBcc: x@y')).toBe('Re: [PKG-2026-0047] A Bcc: x@y')
  })
})
