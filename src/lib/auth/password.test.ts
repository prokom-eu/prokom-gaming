import { describe, expect, it } from 'vitest'

import { PASSWORD_MIN_LENGTH, passwordProblem } from './password'

describe('passwordProblem', () => {
  it('requires at least 12 characters', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12)
    expect(passwordProblem('a'.repeat(11))).toMatch(/12/)
  })

  it('accepts 12 characters without special-character rules', () => {
    expect(passwordProblem('a'.repeat(12))).toBeNull()
    expect(passwordProblem('dlugie haslo bez cyfr')).toBeNull()
  })

  it('ignores a missing password (no password change in this operation)', () => {
    expect(passwordProblem(undefined)).toBeNull()
    expect(passwordProblem(null)).toBeNull()
  })

  it('rejects an empty string when a password is being set (create, reset)', () => {
    expect(passwordProblem('')).not.toBeNull()
  })

  it('treats an empty string as "unchanged" on update, like Payload does', () => {
    expect(passwordProblem('', { emptyMeansUnchanged: true })).toBeNull()
    expect(passwordProblem('a'.repeat(11), { emptyMeansUnchanged: true })).toMatch(/12/)
  })
})
