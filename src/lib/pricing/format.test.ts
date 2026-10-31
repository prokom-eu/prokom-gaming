import { describe, expect, it } from 'vitest'

import { marginStatus } from './format'

describe('marginStatus', () => {
  it('follows the thresholds of the panel: < min bad, < warn warn, else ok', () => {
    expect(marginStatus(0.1092, 0.11, 0.12)).toBe('bad')
    expect(marginStatus(0.11, 0.11, 0.12)).toBe('warn')
    expect(marginStatus(0.1199, 0.11, 0.12)).toBe('warn')
    expect(marginStatus(0.12, 0.11, 0.12)).toBe('ok')
    expect(marginStatus(0.135, 0.11, 0.12)).toBe('ok')
  })

  it('never shows a missing margin as safe', () => {
    expect(marginStatus(null, 0.11, 0.12)).toBe('bad')
    expect(marginStatus(Number.NaN, 0.11, 0.12)).toBe('bad')
  })
})
