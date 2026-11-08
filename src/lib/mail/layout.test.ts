import { describe, expect, it } from 'vitest'

import { buildAccent, esc, LOGO_CID, renderMail, type MailInput } from './layout'

const footer: MailInput['footer'] = {
  contact: [{ label: 'Telefon', value: '+48 883 200 151', href: 'tel:+48883200151' }],
  legal: ['PRO-KOM Tadeusz Wójciak'],
}

describe('renderMail', () => {
  it('escapes every value — blocks take plain text, never HTML', () => {
    const evil = '<script>alert(1)</script>"\'&'
    const { html } = renderMail({
      preheader: evil,
      tagLabel: evil,
      title: evil,
      lead: evil,
      blocks: [
        { kind: 'paragraph', text: evil },
        { kind: 'section', title: evil, rows: [{ label: evil, value: evil }] },
        { kind: 'quote', title: evil, text: evil },
        { kind: 'table', columns: [evil], rows: [[evil]], total: { label: evil, value: evil } },
        { kind: 'buttons', buttons: [{ label: evil, href: 'https://x.pl' }] },
        { kind: 'signature', lines: [evil] },
      ],
      footer: { ...footer, note: evil },
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('lets only http(s), mailto: and tel: links through', () => {
    const { html } = renderMail({
      preheader: '',
      tagLabel: 'Zapytanie PKG-2026-0001',
      blocks: [
        {
          kind: 'buttons',
          buttons: [
            { label: 'a', href: 'javascript:alert(1)' },
            { label: 'b', href: 'mailto:a@b.pl' },
          ],
        },
      ],
      footer,
    })
    expect(html).not.toContain('javascript:')
    expect(html).toContain('href="mailto:a@b.pl"')
  })

  it('attaches the mark inline and points to it by CID', () => {
    const mail = renderMail({ preheader: '', tagLabel: 'x', blocks: [], footer })
    expect(mail.attachments).toHaveLength(1)
    expect(mail.attachments[0]).toMatchObject({ cid: LOGO_CID, contentType: 'image/png' })
    expect(mail.html).toContain(`src="cid:${LOGO_CID}"`)
  })

  it('opts out of Thunderbird’s dark reader without changing the look', () => {
    const { html } = renderMail({ preheader: '', tagLabel: 'x', blocks: [], footer })
    // DarkReader.mjs skips a mail whose root filter contains invert(1); two cancel out.
    expect(html).toContain('html{filter:invert(1) invert(1)}')
    expect(html).toContain('<meta name="color-scheme" content="dark">')
  })
})

describe('buildAccent', () => {
  it('finds the build colour by name, with Polish letters and spaces', () => {
    expect(buildAccent('Wilkołak')).toBe('#C0C7D1')
    expect(buildAccent('Baba Jaga')).toBe('#B26BFF')
    expect(buildAccent('Żmij')).toBe('#FF7A1A')
    expect(buildAccent('Nieznany')).toBeUndefined()
    expect(buildAccent(null)).toBeUndefined()
  })
})

describe('esc', () => {
  it('escapes the five HTML characters', () => {
    expect(esc(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })
})
