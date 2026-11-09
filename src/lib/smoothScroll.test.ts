import { describe, expect, it } from 'vitest'

import {
  SCROLL_MAX_MS,
  SCROLL_MIN_MS,
  scrollDuration,
  scrollEase,
  scrollTargetY,
} from './smoothScroll'

describe('scrollDuration', () => {
  it('is zero when there is nowhere to go', () => {
    expect(scrollDuration(0)).toBe(0)
    expect(scrollDuration(0.4)).toBe(0)
  })

  it('never goes below the minimum or above the maximum', () => {
    expect(scrollDuration(20)).toBe(SCROLL_MIN_MS)
    expect(scrollDuration(100_000)).toBe(SCROLL_MAX_MS)
  })

  it('grows with the distance, the same up and down', () => {
    expect(scrollDuration(3000)).toBeGreaterThan(scrollDuration(800))
    expect(scrollDuration(-1500)).toBe(scrollDuration(1500))
  })
})

describe('scrollEase', () => {
  it('starts at 0 and lands exactly on 1', () => {
    expect(scrollEase(0)).toBe(0)
    expect(scrollEase(1)).toBe(1)
    expect(scrollEase(-1)).toBe(0)
    expect(scrollEase(2)).toBe(1)
  })

  it('only moves forward and never overshoots', () => {
    let prev = 0
    for (let i = 1; i <= 100; i++) {
      const v = scrollEase(i / 100)
      expect(v).toBeGreaterThanOrEqual(prev)
      expect(v).toBeLessThanOrEqual(1)
      prev = v
    }
  })

  it('has no jump in position or speed where the two curves meet', () => {
    const h = 1e-5
    expect(Math.abs(scrollEase(0.4 - h) - scrollEase(0.4 + h))).toBeLessThan(1e-4)
    const before = (scrollEase(0.4) - scrollEase(0.4 - h)) / h
    const after = (scrollEase(0.4 + h) - scrollEase(0.4)) / h
    expect(Math.abs(before - after)).toBeLessThan(1e-3)
  })

  it('starts softly and lands slowly', () => {
    expect(scrollEase(0.1)).toBeLessThan(0.01)
    expect(1 - scrollEase(0.9)).toBeLessThan(0.01)
  })
})

describe('scrollTargetY', () => {
  it('puts the element below the header padding', () => {
    expect(scrollTargetY(500, 1000, 80, 10_000)).toBe(1420)
  })

  it('stays within the page', () => {
    expect(scrollTargetY(-2000, 100, 80, 10_000)).toBe(0)
    expect(scrollTargetY(9000, 5000, 0, 6000)).toBe(6000)
    expect(scrollTargetY(10, 0, 0, -5)).toBe(0)
  })
})
