import { describe, expect, it } from 'vitest'

import { replyHtml, type ReplyOffer } from './replyHtml'
import { buildReplyMail } from './replyMail'

const signature = 'Krystian · PRO-KOM Gaming\nRabka-Zdrój, ul. Orkana 16B · +48 883 200 151'
const base = {
  number: 'PKG-2026-0047',
  signature,
  siteUrl: 'https://prokomgaming.pl',
  replyAddress: 'kontakt@prokomgaming.pl',
}
const offer: ReplyOffer = {
  topic: 'Wilkołak',
  buildName: 'Wilkołak',
  parts: [
    { role: 'Procesor', model: 'AMD Ryzen 7 7800X3D' },
    { role: 'Karta graficzna', model: 'MSI GeForce RTX 5070 Ventus 2X 12G' },
  ],
  price: '9 890 zł',
  leadTime: '5–10 dni roboczych',
}
const offerBody = `Dzień dobry,

przesyłam ofertę PKG-2026-0047: Wilkołak, 9 890 zł z montażem.

Skład:
• AMD Ryzen 7 7800X3D
• MSI GeForce RTX 5070 Ventus 2X 12G

Płatność przelewem albo BLIK po pro formie.

${signature}`

describe('replyHtml', () => {
  it('keeps the text, turns the written signature into the signature block', () => {
    const { html } = replyHtml({
      ...base,
      body: `Dzień dobry,\n\ndziękuję za zapytanie.\n\n${signature}`,
    })
    expect(html).toContain('dziękuję za zapytanie.')
    expect(html).toContain('Krystian · PRO-KOM Gaming')
    expect(html).toContain('Odpowiedź')
    expect(html).not.toContain('Akceptuję ofertę')
  })

  it('adds no signature the text did not have', () => {
    const { html } = replyHtml({ ...base, body: 'Dzień dobry,\n\nkrótko.\n\nKrystian' })
    expect(html).not.toContain('Rabka-Zdrój, ul. Orkana 16B · +48 883 200 151')
  })

  it('offer: card with each part and its role, the total named in the text, the accept mailto', () => {
    const { html } = replyHtml({ ...base, body: offerBody, offer })
    expect(html).toContain('Oferta PKG-2026-0047')
    // Neither validity nor lead time is in this text — the card does not add them.
    expect(html).not.toContain('ważna 48 godzin')
    expect(html).not.toContain('Termin złożenia')
    expect(html).toContain('Karta graficzna')
    expect(html).toContain('MSI GeForce RTX 5070 Ventus 2X 12G')
    expect(html).toContain('9 890 zł')
    expect(html).toContain(
      'mailto:kontakt@prokomgaming.pl?subject=Re%3A%20%5BPKG-2026-0047%5D%20Akcept',
    )
    expect(html).toContain('#C0C7D1') // Wilkołak's colour
    // The list from the text is replaced by the card, not shown twice.
    expect(html.match(/AMD Ryzen 7 7800X3D/g)).toHaveLength(1)
    expect(html).not.toContain('Skład')
  })

  it('offer: validity and lead time on the card only when the text says them', () => {
    const body = offerBody.replace(
      'z montażem.',
      'z montażem. Oferta ważna 48 godzin, składamy w 5–10 dni roboczych.',
    )
    const { html } = replyHtml({ ...base, body, offer })
    expect(html).toContain('Oferta PKG-2026-0047 · ważna 48 godzin')
    expect(html).toContain('Termin złożenia: 5–10 dni roboczych')
  })

  it('offer: a list that is not the configuration (part swapped) stays a list, no card', () => {
    const body = offerBody.replace('AMD Ryzen 7 7800X3D', 'AMD Ryzen 7 9800X3D')
    const { html } = replyHtml({ ...base, body, offer })
    expect(html).not.toContain('Akceptuję ofertę')
    expect(html).toContain('AMD Ryzen 7 9800X3D')
    expect(html).not.toContain('Karta graficzna')
  })

  it('offer: a price changed by hand in the text never shows a second amount on the card', () => {
    const body = offerBody.replace('9 890 zł', '9 490 zł')
    const { html } = replyHtml({ ...base, body, offer })
    expect(html).toContain('Karta graficzna')
    expect(html).toContain('9 490 zł')
    expect(html).not.toContain('9 890 zł')
  })

  it('offer: other lists in the text stay', () => {
    const body = offerBody.replace(
      'Płatność przelewem',
      'W cenie:\n• Windows 11\n• wysyłka\n\nPłatność przelewem',
    )
    const { html } = replyHtml({ ...base, body, offer })
    expect(html).toContain('Windows 11')
    expect(html).toContain('W cenie')
  })

  it('preheader: a one-paragraph reply loses only the greeting', () => {
    const { html } = replyHtml({ ...base, body: 'Dzień dobry, komputer jest gotowy do odbioru.' })
    expect(html).toContain('>komputer jest gotowy do odbioru.')
  })

  it('a plain list in a reply (no offer) becomes a list', () => {
    const { html } = replyHtml({ ...base, body: 'Do wyboru:\n• Wampir\n• Wilkołak' })
    expect(html).toContain('Do wyboru')
    expect(html).toContain('Wampir')
    expect(html).not.toContain('•')
  })

  it('escapes what was typed', () => {
    const { html } = replyHtml({ ...base, body: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert')
  })
})

describe('buildReplyMail with the brand', () => {
  it('sends the brand HTML with the mark; the text stays as written', () => {
    const mail = buildReplyMail({
      to: 'jan@example.test',
      number: 'PKG-2026-0047',
      topic: 'Wilkołak',
      body: offerBody,
      messageId: '<a@prokomgaming.pl>',
      previousIds: [],
      brand: { ...base, offer },
    })
    expect(mail.text).toBe(offerBody)
    expect(mail.html).toContain('Akceptuję ofertę')
    expect(mail.attachments?.[0]?.cid).toBe('logo@prokomgaming.pl')
  })
})
