import { describe, expect, it } from 'vitest'

import {
  acceptanceMail,
  acceptanceSkip,
  acceptanceThreadIds,
  isAcceptance,
  isAcceptanceId,
} from './acceptance'
import { replyHtml } from './replyHtml'

describe('isAcceptance', () => {
  it('finds „Akceptuję ofertę” in any case, with or without Polish letters', () => {
    expect(isAcceptance('Re: [PKG-2026-0001] Akceptuję ofertę')).toBe(true)
    expect(isAcceptance('RE: AKCEPTUJE OFERTE')).toBe(true)
    expect(isAcceptance('Re: [PKG-2026-0001] Wilkołak')).toBe(false)
    expect(isAcceptance('Nie akceptuję tej oferty')).toBe(false)
    expect(isAcceptance('Re: [PKG-2026-0001] Nie akceptuję ofertę')).toBe(false)
  })

  it('matches the subject the offer’s „Akceptuję ofertę” button writes', () => {
    const { html } = replyHtml({
      number: 'PKG-2026-0001',
      body: 'Skład:\n• A',
      signature: null,
      siteUrl: 'https://prokomgaming.pl',
      replyAddress: 'kontakt@prokomgaming.pl',
      offer: {
        topic: 'X',
        buildName: null,
        parts: [{ role: 'Procesor', model: 'A' }],
        price: null,
        leadTime: null,
      },
    })
    const subject = decodeURIComponent(/subject=([^&"]+)/.exec(html)?.[1] ?? '')
    expect(isAcceptance(subject)).toBe(true)
  })
})

describe('acceptanceSkip', () => {
  const ok = {
    subject: 'Re: [PKG-2026-0001] Akceptuję ofertę',
    fromCustomer: true,
    status: 'offer_sent' as const,
    alreadyConfirmed: false,
  }
  it('confirms the customer’s acceptance while the offer is out', () => {
    expect(acceptanceSkip(ok)).toBeNull()
  })
  it('never for a stranger, outside offer_sent (also not after an order), or twice', () => {
    expect(acceptanceSkip({ ...ok, fromCustomer: false })).toBe('stranger')
    expect(acceptanceSkip({ ...ok, status: 'won' })).toBe('status')
    expect(acceptanceSkip({ ...ok, status: 'in_progress' })).toBe('status')
    expect(acceptanceSkip({ ...ok, alreadyConfirmed: true })).toBe('already')
    expect(acceptanceSkip({ ...ok, subject: 'Re: pytanie' })).toBe('not_acceptance')
  })
})

describe('acceptanceThreadIds', () => {
  it('puts the customer’s acceptance last, whatever the thread order says', () => {
    expect(acceptanceThreadIds('<c>', ['<offer>', '<accept>', '<later>'], '<accept>')).toEqual([
      '<c>',
      '<offer>',
      '<later>',
      '<accept>',
    ])
  })
  it('marks our confirmation by its Message-ID', () => {
    expect(isAcceptanceId('<accept-1@prokomgaming.pl>')).toBe(true)
    expect(isAcceptanceId('<1@prokomgaming.pl>')).toBe(false)
    expect(isAcceptanceId(null)).toBe(false)
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
