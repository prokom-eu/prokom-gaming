import type { Validate } from 'payload'
import { describe, expect, it } from 'vitest'

import { requiredFor, requiredWhen } from './shared'

const ok: Validate = () => true
const run = (validate: Validate, value: unknown, siblingData: object) =>
  validate(value, { siblingData } as Parameters<Validate>[1])

describe('option field validators', () => {
  it('requiredFor: required only for the listed option types', () => {
    const v = requiredFor(['case'], ok)
    expect(run(v, null, { type: 'case' })).toBeTypeOf('string')
    expect(run(v, 325, { type: 'case' })).toBe(true)
    expect(run(v, null, { type: 'ram' })).toBe(true)
  })

  // An air cooler without height would break the clearance rule of G4 (cooler_too_tall).
  it('requiredWhen: cooler height only for air coolers', () => {
    const v = requiredWhen((s) => s.type === 'cooler' && s.kind === 'air', ok)
    expect(run(v, undefined, { type: 'cooler', kind: 'air' })).toBeTypeOf('string')
    expect(run(v, 155, { type: 'cooler', kind: 'air' })).toBe(true)
    expect(run(v, undefined, { type: 'cooler', kind: 'aio360' })).toBe(true)
  })

  it('runs the default validator after the check', () => {
    const base: Validate = () => 'za mało'
    expect(run(requiredFor(['case'], base), 1, { type: 'case' })).toBe('za mało')
  })
})
