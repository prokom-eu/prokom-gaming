import { describe, expect, it } from 'vitest'

import { rawMessage } from './imap.server'
import { parseMail } from './parse'

describe('rawMessage (copy in „Sent”, ADR-G008 pt 1)', () => {
  it('keeps our Message-ID, the thread headers, subject and text', async () => {
    const raw = await rawMessage({
      from: { name: 'PRO-KOM Gaming', address: 'formularz@example.test' },
      to: 'klient@example.com',
      subject: 'Re: [PKG-2026-0047] Wampir',
      text: 'Dzień dobry,\n\ncena 6 990 zł.',
      html: '<p>Dzień dobry,</p><p>cena 6 990 zł.</p>',
      messageId: '<out-2@example.test>',
      inReplyTo: '<out-1@example.test>',
      references: ['<confirm-1@example.test>', '<out-1@example.test>'],
      date: new Date('2026-11-02T18:20:00Z'),
    })
    const mail = await parseMail(raw)
    expect(mail).toMatchObject({
      from: 'formularz@example.test',
      subject: 'Re: [PKG-2026-0047] Wampir',
      messageId: '<out-2@example.test>',
      references: ['<out-1@example.test>', '<confirm-1@example.test>'],
      receivedAt: '2026-11-02T18:20:00.000Z',
      body: 'Dzień dobry,\n\ncena 6 990 zł.',
    })
  })
})
