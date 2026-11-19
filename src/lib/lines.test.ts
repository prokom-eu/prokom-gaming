import { describe, expect, it } from 'vitest'

import { CURRENT_LINE, LINES } from './lines'

describe('LINES', () => {
  it('lists the lines in the order of every PRO-KOM site, Gaming last', () => {
    expect(LINES.map((line) => line.key)).toEqual([
      'prokom',
      'biznes',
      'instalacje',
      'software',
      'tech',
      'gaming',
    ])
    expect(LINES.at(-1)?.key).toBe(CURRENT_LINE)
  })

  it('links the other lines to their https domains and Gaming to its own home page', () => {
    for (const line of LINES.filter((l) => l.key !== CURRENT_LINE)) {
      expect(line.href).toMatch(/^https:\/\/[a-z.-]+$/)
    }
    expect(LINES.find((l) => l.key === CURRENT_LINE)?.href).toBe('/')
    expect(new Set(LINES.map((l) => l.href)).size).toBe(LINES.length)
  })

  it('takes colours from tokens and has a short description for every line', () => {
    for (const line of LINES) {
      expect(line.color).toMatch(/^var\(--[a-z-]+\)$/)
      expect(line.description.length).toBeGreaterThan(0)
      expect(line.description.length).toBeLessThanOrEqual(40)
    }
  })
})
