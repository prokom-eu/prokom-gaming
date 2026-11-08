import { describe, expect, it } from 'vitest'

import { plural } from './pl'

const forms = ['zestaw', 'zestawy', 'zestawów'] as const

describe('plural', () => {
  it.each([
    [0, 'zestawów'],
    [1, 'zestaw'],
    [2, 'zestawy'],
    [4, 'zestawy'],
    [5, 'zestawów'],
    [12, 'zestawów'],
    [14, 'zestawów'],
    [22, 'zestawy'],
    [112, 'zestawów'],
    [124, 'zestawy'],
  ])('%i → %s', (n, expected) => {
    expect(plural(n, forms)).toBe(expected)
  })
})
