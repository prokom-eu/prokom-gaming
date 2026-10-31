import { describe, expect, it } from 'vitest'

import { normalizeEmail } from './email'

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Jan.Kowalski@Example.PL ')).toBe('jan.kowalski@example.pl')
  })

  it('leaves non-strings alone', () => {
    expect(normalizeEmail(undefined)).toBeUndefined()
    expect(normalizeEmail(null)).toBeNull()
  })
})
