import { describe, expect, it } from 'vitest'

import {
  panelResetEmailHtml,
  panelResetUrl,
  resetEmailHtml,
  resetUrl,
  verifyEmailHtml,
  verifyUrl,
} from './emails'

describe('account e-mails', () => {
  const link = verifyUrl('https://prokomgaming.pl', 'abc123')

  it('verify: greeting with the name, the link as a button and as text to copy', () => {
    const html = verifyEmailHtml({ name: 'Ola', link })
    expect(html).toContain('Cześć Ola,')
    expect(html).toContain('Potwierdź adres e-mail')
    expect(html.split(`href="${link}"`).length - 1).toBeGreaterThanOrEqual(1)
    expect(html).toContain(link)
  })

  it('sets the mark in text — Payload sends these without attachments', () => {
    const html = resetEmailHtml({ name: null, link: resetUrl('https://prokomgaming.pl', 't') })
    expect(html).not.toContain('cid:')
    expect(html).toContain('GAMING')
    expect(html).toContain('Cześć,')
  })

  it('escapes the name', () => {
    expect(verifyEmailHtml({ name: '<b>x</b>', link })).not.toContain('<b>x</b>')
  })
})

describe('panel reset e-mail', () => {
  it('points to Payload’s reset page of the panel', () => {
    const link = panelResetUrl('https://prokomgaming.pl', '/admin', '/reset', 'a b')
    expect(link).toBe('https://prokomgaming.pl/admin/reset/a%20b')
    expect(panelResetEmailHtml({ link })).toContain('Nowe hasło do panelu')
  })
})
