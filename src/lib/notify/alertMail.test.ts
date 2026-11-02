import { describe, expect, it } from 'vitest'

import { alertHtml } from './alertMail'

describe('alertHtml', () => {
  const mail = alertHtml({
    subject: 'Raport cen: zmiany wymagające uwagi',
    text: [
      'Sprawdzanie cen znalazło zmiany wymagające uwagi:',
      '',
      '- RTX 5070: +12% u dostawcy',
      '- Ryzen 7 7800X3D: brak w magazynie',
      '',
      'Raport: https://prokomgaming.pl/admin/raporty-cen/7',
      'Nic nie zmieniło się na stronie — nowe ceny zatwierdzasz w panelu.',
    ].join('\n'),
    siteUrl: 'https://prokomgaming.pl',
  })

  it('subject as the headline, points as a list, the link line as a gold button', () => {
    expect(mail.html).toContain('Raport cen: zmiany wymagające uwagi')
    expect(mail.html).toContain('RTX 5070: +12% u dostawcy')
    expect(mail.html).toContain('href="https://prokomgaming.pl/admin/raporty-cen/7"')
    expect(mail.html).toContain('>Raport →<')
    expect(mail.html).toContain('Nic nie zmieniło się na stronie')
    expect(mail.attachments[0]?.cid).toBe('logo@prokomgaming.pl')
  })

  it('„Klucz: wartość” lines become a table; text is escaped', () => {
    const { html } = alertHtml({
      subject: 'Tydzień',
      text: 'Zapytania: 12\nZamówienia: 3\nOdpowiedź <b>: 41 min',
    })
    expect(html).toContain('Szczegóły')
    expect(html).toContain('Zamówienia')
    expect(html).not.toContain('<b>')
  })
})
