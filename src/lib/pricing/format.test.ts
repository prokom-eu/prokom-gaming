import { describe, expect, it } from 'vitest'

import { marginStatus, percentShort } from './format'

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

describe('percentShort', () => {
  it('one decimal, whole numbers without ",0"', () => {
    expect(percentShort(0.128)).toBe('12,8%')
    expect(percentShort(0.11)).toBe('11%')
    expect(percentShort(0.111)).toBe('11,1%')
    expect(percentShort(0.092)).toBe('9,2%')
  })

  it('rounds down: under the minimum never reads as the minimum', () => {
    expect(percentShort(0.10996)).toBe('10,9%')
    expect(percentShort(0.1149)).toBe('11,4%')
    expect(percentShort(-0.0123)).toBe('−1,3%')
  })

  it('no margin = dash', () => {
    expect(percentShort(null)).toBe('—')
    expect(percentShort(Number.NaN)).toBe('—')
  })
})
