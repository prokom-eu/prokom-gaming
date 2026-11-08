import { describe, expect, it } from 'vitest'

import { buildReplyMail, newMessageId, textToHtml, threadHeaders } from './replyMail'

describe('newMessageId', () => {
  it('uses the domain of the sender', () => {
    expect(newMessageId('gaming@pro-kom.eu', 'abc')).toBe('<abc@pro-kom.eu>')
    expect(newMessageId('broken', 'abc')).toBe('<abc@localhost>')
  })
})

describe('threadHeaders', () => {
  it('nothing before the first message', () => {
    expect(threadHeaders([null, undefined, ''])).toEqual({})
  })

  it('answers the latest message and references the whole thread', () => {
    expect(threadHeaders(['<a@x>', null, '<b@x>'])).toEqual({
      inReplyTo: '<b@x>',
      references: ['<a@x>', '<b@x>'],
    })
  })

  it('a long thread keeps the root and the newest ids', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `<${i}@x>`)
    const { references } = threadHeaders(ids)
    expect(references).toHaveLength(20)
    expect(references?.[0]).toBe('<0@x>')
    expect(references?.[19]).toBe('<29@x>')
  })
})

describe('textToHtml', () => {
  it('paragraphs, line breaks, escaped', () => {
    expect(textToHtml('Dzień dobry,\n\n<b>x</b> & y\nPozdrawiam')).toBe(
      '<p>Dzień dobry,</p>\n<p>&lt;b&gt;x&lt;/b&gt; &amp; y<br>Pozdrawiam</p>',
    )
  })
})

describe('buildReplyMail', () => {
  it('subject with the number, the text as written, thread headers', () => {
    const mail = buildReplyMail({
      to: 'klient@example.test',
      number: 'PKG-2026-0047',
      topic: 'Wampir',
      body: 'Dzień dobry,\r\n\r\nodpowiedź.\r\n\r\nPozdrawiam,\r\nKrystian\r\n',
      messageId: '<m2@pro-kom.eu>',
      previousIds: ['<confirm@pro-kom.eu>'],
    })
    expect(mail).toEqual({
      to: 'klient@example.test',
      subject: 'Re: [PKG-2026-0047] Wampir',
      text: 'Dzień dobry,\n\nodpowiedź.\n\nPozdrawiam,\nKrystian',
      html: '<p>Dzień dobry,</p>\n<p>odpowiedź.</p>\n<p>Pozdrawiam,<br>Krystian</p>',
      messageId: '<m2@pro-kom.eu>',
      inReplyTo: '<confirm@pro-kom.eu>',
      references: ['<confirm@pro-kom.eu>'],
    })
  })
})
