import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { MAX_BODY, parseMail, skipReason, stripQuoted } from './parse'

const fixture = (name: string) =>
  readFileSync(path.resolve(__dirname, '../../../tests/fixtures/mail', name))

const OWN = 'formularz@example.test'

describe('parseMail (ADR-G008 pt 4, fixtures)', () => {
  it('reads a reply with the number in the subject and cuts the quoted mail', async () => {
    const mail = await parseMail(fixture('numer-w-temacie.eml'))
    expect(mail.from).toBe('klient@example.com')
    expect(mail.subject).toBe('Re: [PKG-2026-0047] Wampir')
    expect(mail.messageId).toBe('<reply-1@mail.example.com>')
    expect(mail.references).toEqual(['<out-1@example.test>', '<confirm-1@example.test>'])
    expect(mail.receivedAt).toBe('2026-11-02T18:40:00.000Z')
    expect(mail.body).toBe(
      'Dzień dobry,\n\npasuje mi termin, proszę o fakturę pro forma.\nCzy obudowa może być biała?\n\nPozdrawiam',
    )
    expect(mail.attachmentsInfo).toBeNull()
  })

  it('reads In-Reply-To alone and cuts the English quote header', async () => {
    const mail = await parseMail(fixture('in-reply-to.eml'))
    expect(mail.references).toEqual(['<out-1@example.test>'])
    expect(mail.body).toBe('Jeszcze jedno: czy da się odebrać osobiście w Rabce?')
  })

  it('reads a mail without any reference', async () => {
    const mail = await parseMail(fixture('bez-dopasowania.eml'))
    expect(mail.from).toBe('inna@example.org')
    expect(mail.references).toEqual([])
    expect(mail.subject).toBe('Pytanie o komputer do montażu filmów')
  })

  it('turns HTML into text: no tags, scripts, styles, images or the Gmail quote', async () => {
    const mail = await parseMail(fixture('html-z-cytatem.eml'))
    expect(mail.subject).toBe('Re: [PKG-2026-0047] Wampir')
    expect(mail.body).toContain('przelew wysłany')
    expect(mail.body).toContain('dziękuję')
    for (const bad of [
      '<',
      'alert',
      'color:red',
      'tracker.example.com',
      'numer konta',
      'napisał',
    ]) {
      expect(mail.body, bad).not.toContain(bad)
    }
  })

  it('lists attachments by name and size, never their content', async () => {
    const mail = await parseMail(fixture('zalacznik.eml'))
    expect(mail.body).toBe('W załączniku potwierdzenie przelewu.')
    expect(mail.attachmentsInfo).toBe('potwierdzenie.pdf (1 KB)')
  })

  it('marks an autoresponder and our own messages to be skipped', async () => {
    expect(skipReason(await parseMail(fixture('autoresponder.eml')), OWN)).toBe('auto')
    expect(skipReason(await parseMail(fixture('wlasny-nadawca.eml')), OWN)).toBe('own')
    expect(skipReason(await parseMail(fixture('numer-w-temacie.eml')), OWN)).toBeNull()
  })

  it('caps the body at 20 000 characters', async () => {
    const long = `From: a@example.com\r\nSubject: x\r\n\r\n${'a'.repeat(MAX_BODY + 500)}`
    const mail = await parseMail(Buffer.from(long))
    expect(mail.body.length).toBeLessThanOrEqual(MAX_BODY)
    expect(mail.body.endsWith('…')).toBe(true)
  })

  it('survives a mail without From, Date or Message-ID', async () => {
    const mail = await parseMail(Buffer.from('Subject: pusto\r\n\r\n'))
    expect(mail).toMatchObject({ from: null, messageId: null, body: '', references: [] })
    expect(mail.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('skipReason', () => {
  const base = { from: 'klient@example.com', headers: {} }
  it('skips Auto-Submitted other than „no” and bulk/auto_reply precedence', () => {
    expect(skipReason({ ...base, headers: { 'auto-submitted': 'auto-generated' } }, OWN)).toBe(
      'auto',
    )
    expect(skipReason({ ...base, headers: { 'auto-submitted': 'no' } }, OWN)).toBeNull()
    expect(skipReason({ ...base, headers: { precedence: 'bulk' } }, OWN)).toBe('auto')
    expect(skipReason({ ...base, headers: { precedence: 'auto_reply' } }, OWN)).toBe('auto')
    expect(skipReason({ ...base, headers: { 'x-autoreply': 'yes' } }, OWN)).toBe('auto')
  })

  it('skips bounces and mail without a sender', () => {
    expect(skipReason({ ...base, from: 'mailer-daemon@example.com' }, OWN)).toBe('auto')
    expect(skipReason({ ...base, from: null }, OWN)).toBe('auto')
  })
})

describe('stripQuoted', () => {
  it('cuts at Polish and English quote headers and at a trailing > block', () => {
    expect(stripQuoted('Tak.\n\nW dniu 2.11.2026 o 19:20 Ktoś <a@b.c> napisał(a):\n> x')).toBe(
      'Tak.',
    )
    expect(stripQuoted('Yes.\n\nOn Mon, Nov 2, 2026 at 7:20 PM X <a@b.c> wrote:\n> x')).toBe('Yes.')
    expect(stripQuoted('Ok.\n\n> stare\n> stare')).toBe('Ok.')
    expect(stripQuoted('Ok.\n-----Original Message-----\nFrom: x')).toBe('Ok.')
    expect(stripQuoted('Ok.\n\nOd: PRO-KOM\nWysłano: wtorek\nTemat: x')).toBe('Ok.')
  })

  it('joins a quote header wrapped over two lines', () => {
    expect(stripQuoted('Tak.\n\nW dniu wt., 3 lis 2026 o 09:30 PRO-KOM\nnapisał(a):\n> x')).toBe(
      'Tak.',
    )
  })

  it('keeps the text when everything would be cut, and keeps inline > replies', () => {
    expect(stripQuoted('> tylko cytat')).toBe('> tylko cytat')
    expect(stripQuoted('> pytanie\nodpowiedź')).toBe('> pytanie\nodpowiedź')
  })
})
