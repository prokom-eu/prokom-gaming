import { describe, expect, it } from 'vitest'

import { generateUnitCode, normalizeUnitCode, UNIT_CODE_ALPHABET } from './units'

describe('generateUnitCode', () => {
  it('gives 16 characters from the sticker alphabet in groups of four (≥ 12, ADR-G005)', () => {
    const code = generateUnitCode()
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{4}(-[2-9A-HJKMNP-Z]{4}){3}$/)
    expect(code.replace(/-/g, '')).toHaveLength(16)
  })

  it('has no look-alike characters', () => {
    for (const c of '01ILO') expect(UNIT_CODE_ALPHABET).not.toContain(c)
  })

  it('gives different codes each time', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateUnitCode()))
    expect(codes.size).toBe(500)
  })

  it('takes every character from the random source', () => {
    let i = 0
    const code = generateUnitCode(() => i++ % UNIT_CODE_ALPHABET.length)
    expect(code).toBe('2345-6789-ABCD-EFGH')
  })
})

describe('normalizeUnitCode', () => {
  it('accepts what people type from a sticker', () => {
    expect(normalizeUnitCode(' 7kq2 m9xa-b3cd efgh ')).toBe('7KQ2-M9XA-B3CD-EFGH')
    expect(normalizeUnitCode('7KQ2M9XAB3CDEFGH')).toBe('7KQ2-M9XA-B3CD-EFGH')
  })

  it('rejects anything that cannot be a code', () => {
    expect(normalizeUnitCode('7KQ2-M9XA')).toBeNull()
    expect(normalizeUnitCode('0KQ2-M9XA-B3CD-EFGH')).toBeNull()
    expect(normalizeUnitCode('../../etc')).toBeNull()
    expect(normalizeUnitCode(42)).toBeNull()
  })
})
