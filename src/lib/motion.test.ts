import { describe, expect, it } from 'vitest'

import { matchesMedia, prefersReducedMotion, STAGGER_MAX, staggerIndex } from './motion'

describe('staggerIndex', () => {
  it('counts items one by one up to the cascade limit', () => {
    expect([0, 1, 2, 3, 4, 5].map(staggerIndex)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('puts every item past the limit in the last slot (max 6 in a cascade)', () => {
    expect(STAGGER_MAX).toBe(6)
    expect(staggerIndex(6)).toBe(5)
    expect(staggerIndex(15)).toBe(5)
  })

  it('never goes below zero', () => {
    expect(staggerIndex(-3)).toBe(0)
    expect(staggerIndex(2.7)).toBe(2)
  })
})

describe('media queries on the server', () => {
  it('answer false without a window', () => {
    expect(matchesMedia('(min-width: 1px)')).toBe(false)
    expect(prefersReducedMotion()).toBe(false)
  })
})
