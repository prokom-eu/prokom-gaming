import { describe, expect, it } from 'vitest'

import { CONSENT_CLAUSE } from './consent'
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

  it('rejects voucher and ready until G13, and unknown types', () => {
    expect(fields({ ...base, type: 'voucher' })).toContain('type')
    expect(fields({ ...base, type: 'ready' })).toContain('type')
    expect(fields({ ...base, type: 'order' })).toContain('type')
  })

  it('always requires a name, an e-mail and the current consent', () => {
    expect(fields({ ...build, name: ' ' })).toContain('name')
    expect(fields({ ...build, email: undefined })).toContain('email')
    expect(fields({ ...build, email: 'nie-mail' })).toContain('email')
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
