import { describe, expect, it } from 'vitest'

import { saveDecision } from './saveRule'

const base = { current: 'published', next: 'published', before: 11930, price: 11930 } as const

describe('saveDecision (build editor „Zapisz”)', () => {
  it('same price on the site: saves without asking', () => {
    expect(saveDecision({ ...base, confirmedPrice: null })).toEqual({ kind: 'save' })
  })

  it('a new price on the site needs the confirmation of exactly that price', () => {
    const changed = { ...base, price: 11850 }
    expect(saveDecision({ ...changed, confirmedPrice: null })).toEqual({
      kind: 'confirm',
      from: 11930,
      to: 11850,
    })
    // A confirmation of another price (stale screen) asks again.
    expect(saveDecision({ ...changed, confirmedPrice: 11800 }).kind).toBe('confirm')
    expect(saveDecision({ ...changed, confirmedPrice: 11850 })).toEqual({ kind: 'save' })
  })

  it('coming back on the site asks even with the same price', () => {
    expect(saveDecision({ ...base, current: 'draft', confirmedPrice: null })).toEqual({
      kind: 'confirm',
      from: null,
      to: 11930,
    })
    expect(saveDecision({ ...base, current: 'hidden', confirmedPrice: 11930 })).toEqual({
      kind: 'save',
    })
  })

  it('an item without a published price blocks only a build that will be on the site', () => {
    expect(saveDecision({ ...base, price: null, confirmedPrice: null })).toEqual({
      kind: 'no-price',
    })
    for (const next of ['draft', 'hidden'] as const) {
      expect(saveDecision({ ...base, next, price: null, confirmedPrice: null })).toEqual({
        kind: 'save',
      })
    }
  })

  it('taking a build off the site never asks', () => {
    expect(saveDecision({ ...base, next: 'hidden', price: 9000, confirmedPrice: null })).toEqual({
      kind: 'save',
    })
  })
})
