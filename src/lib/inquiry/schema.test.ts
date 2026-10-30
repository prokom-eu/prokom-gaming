import { describe, expect, it } from 'vitest'

import { CONSENT_CLAUSE, CONTACT_CONSENT_CLAUSE } from './consent'
import { isValidNip, normalizeNip } from './nip'
import { inquiryFieldErrors, parseInquiryInput } from './schema'

const base = {
  name: 'Jan',
  email: 'jan@example.test',
  consent: { accepted: true, clauseVersion: CONSENT_CLAUSE.version },
  source: { url: 'http://localhost:3100/zapytanie' },
}

const build = { ...base, type: 'build', build: 'wampir' }

const fields = (input: unknown): string[] => {
  const result = parseInquiryInput(input)
  return result.success ? [] : inquiryFieldErrors(result.error)
}

describe('NIP', () => {
  it('accepts a valid check digit with separators or a PL prefix', () => {
    expect(isValidNip('735-251-14-47')).toBe(true)
    expect(isValidNip('PL 7352511447')).toBe(true)
    expect(normalizeNip('PL 735-251-14-47')).toBe('7352511447')
  })

  it('rejects a wrong check digit or length', () => {
    expect(isValidNip('7352511448')).toBe(false)
    expect(isValidNip('735251144')).toBe(false)
    expect(isValidNip('abcdefghij')).toBe(false)
  })
})

describe('parseInquiryInput', () => {
  it('accepts a build inquiry and drops unknown keys (a price from the browser too)', () => {
    const result = parseInquiryInput({ ...build, price: 1, number: 'PKG-2026-9999', status: 'won' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).not.toHaveProperty('price')
    expect(result.data).not.toHaveProperty('number')
    expect(result.data).not.toHaveProperty('status')
    expect(result.data.marketingConsent).toBe(false)
    expect(result.data.games).toEqual([])
  })

  it('treats empty strings as missing', () => {
    const result = parseInquiryInput({ ...build, phone: '  ', message: '', monitor: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBeUndefined()
  })

  it('rejects unknown types', () => {
    expect(fields({ ...base, type: 'order' })).toContain('type')
  })

  it('voucher: an amount from the list and a look; its fields only in a voucher', () => {
    const voucher = { amount: 1000, design: 'perun', recipient: 'Dla Kuby' }
    expect(fields({ ...base, type: 'voucher', voucher })).toEqual([])
    expect(fields({ ...base, type: 'voucher' })).toContain('voucher')
    expect(fields({ ...base, type: 'voucher', voucher: { ...voucher, amount: 750 } })).toContain(
      'voucher.amount',
    )
    expect(fields({ ...base, type: 'voucher', voucher: { ...voucher, design: 'zmij' } })).toContain(
      'voucher.design',
    )
    expect(fields({ ...build, voucher })).toContain('voucher')
  })

  it('ready: the unit id, nothing priced from the browser; the unit only in ready', () => {
    expect(fields({ ...base, type: 'ready', stock: 3 })).toEqual([])
    expect(fields({ ...base, type: 'ready' })).toContain('stock')
    expect(fields({ ...base, type: 'ready', stock: 3, build: 'wampir' })).toContain('build')
    expect(fields({ ...base, type: 'contact', message: 'x', stock: 3 })).toContain('stock')
  })

  it('always requires a name, an e-mail and the current consent', () => {
    expect(fields({ ...build, name: ' ' })).toContain('name')
    expect(fields({ ...build, email: undefined })).toContain('email')
    expect(fields({ ...build, email: 'nie-mail' })).toContain('email')
    // Domains Payload's e-mail field rejects must fail here too, not at the database (review G6).
    expect(fields({ ...build, email: 'jan@foo-.pl' })).toContain('email')
    expect(fields({ ...build, email: 'jan..k@example.test' })).toContain('email')
    expect(fields({ ...build, email: 'jan.kowalski+gry@poczta.example.pl' })).toEqual([])
    expect(
      fields({ ...build, consent: { accepted: false, clauseVersion: CONSENT_CLAUSE.version } }),
    ).toContain('consent.accepted')
    expect(
      fields({ ...build, consent: { accepted: true, clauseVersion: '2020-01-01' } }),
    ).toContain('consent.clauseVersion')
  })

  it('requires a phone when the customer wants a call', () => {
    expect(fields({ ...build, preferredContact: 'phone' })).toContain('phone')
    expect(fields({ ...build, preferredContact: 'phone', phone: '+48 600 100 200' })).toEqual([])
    expect(fields({ ...build, phone: 'zadzwoń' })).toContain('phone')
    expect(fields({ ...build, phone: '------' })).toContain('phone')
    expect(fields({ ...build, phone: '(12) 34' })).toContain('phone')
    expect(fields({ ...build, phone: '18 267 65 11' })).toEqual([])
  })

  it('NIP: required for a company invoice, valid, only there', () => {
    expect(fields({ ...build, invoice: 'company' })).toContain('nip')
    expect(fields({ ...build, invoice: 'company', nip: '7352511448' })).toContain('nip')
    expect(fields({ ...build, invoice: 'private', nip: '7352511447' })).toContain('nip')
    const ok = parseInquiryInput({ ...build, invoice: 'company', nip: '735-251-14-47' })
    expect(ok.success && ok.data.nip).toBe('7352511447')
  })

  describe('computer by type', () => {
    const full = { level: 'P07', case: 'SIG3A', cooler: 'EXO', ram: 'R32', ssd: 'S1' }

    it('build needs a build; changes to its recipe are optional codes', () => {
      expect(fields({ ...base, type: 'build' })).toContain('build')
      expect(fields({ ...build, config: { ram: 'R64' } })).toEqual([])
    })

    it('config needs all five codes', () => {
      expect(fields({ ...base, type: 'config', config: full })).toEqual([])
      expect(fields({ ...base, type: 'config', config: { ...full, ssd: undefined } })).toEqual([
        'config.ssd',
      ])
    })

    it('compare takes a build or a full configuration', () => {
      expect(fields({ ...base, type: 'compare', build: 'wampir' })).toEqual([])
      expect(fields({ ...base, type: 'compare', config: full })).toEqual([])
      expect(fields({ ...base, type: 'compare', config: { ram: 'R32' } })).toContain('build')
    })

    it('codes and slugs have a strict shape', () => {
      expect(fields({ ...build, build: '../wampir' })).toContain('build')
      expect(fields({ ...build, config: { ram: 'R32; DROP' } })).toContain('config.ram')
    })

    it('other types carry no computer', () => {
      const advice = { ...base, type: 'advice' }
      expect(fields({ ...advice, build: 'wampir' })).toContain('build')
      expect(fields({ ...advice, config: full })).toContain('config')
      expect(fields({ ...advice, lightColor: 'lod' })).toContain('lightColor')
    })

    it('light colour: one of six, optional, only with a computer', () => {
      expect(fields({ ...build, lightColor: 'lod' })).toEqual([])
      expect(fields({ ...build, lightColor: '' })).toEqual([])
      expect(fields({ ...build, lightColor: 'neon' })).toContain('lightColor')
    })
  })

  it('advice and custom list fields stay in their types', () => {
    expect(fields({ ...base, type: 'advice', forWhom: 'child', budget: '6k_9k' })).toEqual([])
    expect(fields({ ...base, type: 'advice', budget: '1 mln' })).toContain('budget')
    expect(fields({ ...build, forWhom: 'child' })).toContain('forWhom')
    expect(fields({ ...base, type: 'custom_list', customList: 'RTX, 32 GB' })).toEqual([])
    expect(fields({ ...build, customList: 'x' })).toContain('customList')
  })

  it('contact needs a message', () => {
    expect(fields({ ...base, type: 'contact' })).toContain('message')
    expect(fields({ ...base, type: 'contact', message: 'Czy wysyłacie za granicę?' })).toEqual([])
  })

  it('accepts the clause of „Krótkie pytanie?” (/kontakt) with its own version', () => {
    const consent = { accepted: true, clauseVersion: CONTACT_CONSENT_CLAUSE.version }
    expect(fields({ ...base, type: 'contact', message: 'Pytanie', consent })).toEqual([])
  })

  it('games and extras: known shapes, no duplicates', () => {
    expect(fields({ ...build, games: ['cs2', 'cs2'] })).toContain('games')
    expect(fields({ ...build, extras: ['monitor', 'drukarka'] })).toContain('extras.1')
    expect(fields({ ...build, games: ['cyberpunk-2077'], extras: ['monitor'] })).toEqual([])
  })

  it('source must be an http(s) address', () => {
    expect(fields({ ...build, source: { url: 'javascript:alert(1)' } })).toContain('source.url')
  })

  it('error paths never contain the submitted values', () => {
    const errors = fields({ ...build, email: 'tajny-adres', phone: 'tajny-telefon' })
    expect(errors.join(' ')).not.toMatch(/tajny/)
  })
})
