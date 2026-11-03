import { describe, expect, it } from 'vitest'

import { acceptanceApplies, acceptanceMail, isAcceptance } from './acceptance'

describe('isAcceptance', () => {
  it('finds „Akceptuję ofertę” in any case, with or without Polish letters', () => {
    expect(isAcceptance('Re: [PKG-2026-0001] Akceptuję ofertę')).toBe(true)
    expect(isAcceptance('RE: AKCEPTUJE OFERTE')).toBe(true)
    expect(isAcceptance('Re: [PKG-2026-0001] Wilkołak')).toBe(false)
    expect(isAcceptance('Nie akceptuję tej oferty')).toBe(false)
  })
})

describe('acceptanceApplies', () => {
  const ok = {
    subject: 'Re: [PKG-2026-0001] Akceptuję ofertę',
    fromCustomer: true,
    status: 'offer_sent' as const,
    alreadyConfirmed: false,
  }
  it('confirms the customer’s acceptance after an offer or an order', () => {
    expect(acceptanceApplies(ok)).toBe(true)
    expect(acceptanceApplies({ ...ok, status: 'won' })).toBe(true)
  })
  it('never for a stranger, without an offer, or twice', () => {
    expect(acceptanceApplies({ ...ok, fromCustomer: false })).toBe(false)
    expect(acceptanceApplies({ ...ok, status: 'in_progress' })).toBe(false)
    expect(acceptanceApplies({ ...ok, alreadyConfirmed: true })).toBe(false)
  })
})

describe('acceptanceMail', () => {
  const mail = acceptanceMail({
    to: 'jan@example.test',
    number: 'PKG-2026-0001',
    topic: 'Wilkołak',
    buildName: 'Wilkołak',
    leadTime: '5–10 dni roboczych od wpłaty',
    siteUrl: 'https://prokomgaming.pl',
    messageId: '<b@prokomgaming.pl>',
    previousIds: ['<conf@prokomgaming.pl>', '<accept@gmail.com>'],
  })
  it('replies in the thread with the number in the subject', () => {
    expect(mail.subject).toBe('Re: [PKG-2026-0001] Mamy Twoją akceptację')
    expect(mail.inReplyTo).toBe('<accept@gmail.com>')
    expect(mail.references).toEqual(['<conf@prokomgaming.pl>', '<accept@gmail.com>'])
  })
  it('brand HTML with the steps and the lead time; text version; no price', () => {
    expect(mail.html).toContain('Mamy Twoją akceptację.')
    expect(mail.html).toContain('Faktura pro forma')
    expect(mail.html).toContain('5–10 dni roboczych od wpłaty')
    expect(mail.text).toContain('akceptację oferty PKG-2026-0001 (Wilkołak)')
    expect(mail.html).not.toMatch(/\d zł/)
    expect(mail.attachments[0]?.cid).toBe('logo@prokomgaming.pl')
  })
})
