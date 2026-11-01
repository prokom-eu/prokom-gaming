import { describe, expect, it } from 'vitest'

import { decide, marketCost } from './market'
import { parseAnswer, readingSchema } from './schema'
import { numbersOf, unknownNumbers } from './summary'
import { callCostUsd, monthStart, overBudget, READ_MODEL, SEARCH_MODEL } from './usage'

const reading = {
  url: 'https://www.x-kom.pl/p/1',
  shop: 'x-kom.pl',
  title: 'GOODRAM 32 GB DDR5 6000',
  matches: true,
  price_pln: 2397,
  available: true,
  cited_text: '2 397,00 zł',
  reason: '',
}

describe('parseAnswer (ADR-G007 §3)', () => {
  it('reads the JSON even with a sentence around it', () => {
    const parsed = parseAnswer(`Oto wynik:\n${JSON.stringify(reading)}\nKoniec.`, readingSchema)
    expect(parsed).toEqual({ ok: true, value: reading })
  })

  it('a broken or incomplete answer is invalid, never a guess', () => {
    expect(parseAnswer('brak danych', readingSchema)).toEqual({ ok: false, reason: 'no_json' })
    expect(parseAnswer('{"url": "x", ', readingSchema)).toEqual({ ok: false, reason: 'no_json' })
    expect(parseAnswer('{"url": 1}', readingSchema)).toEqual({ ok: false, reason: 'invalid' })
    const long = { ...reading, cited_text: 'x'.repeat(201) }
    expect(parseAnswer(JSON.stringify(long), readingSchema).ok).toBe(false)
  })

  it('matches:false with no price is valid (another variant on the page)', () => {
    const other = { ...reading, matches: false, price_pln: null, reason: 'Inna pojemność.' }
    expect(parseAnswer(JSON.stringify(other), readingSchema)).toEqual({ ok: true, value: other })
  })
})

describe('marketCost', () => {
  const offers = [
    { price: 2450, available: true, matched: true },
    { price: 2397, available: true, matched: true },
    { price: 2100, available: false, matched: true }, // not in stock
    { price: 1999, available: true, matched: false }, // another product
    { price: null, available: true, matched: true },
  ]

  it('lowest: the lowest available, same-product offer', () => {
    expect(marketCost(offers, 'lowest')).toBe(2397)
  })

  it('avg2: the average of the two lowest; one offer = that offer', () => {
    expect(marketCost(offers, 'avg2')).toBe(2423.5)
    expect(marketCost([offers[0]!], 'avg2')).toBe(2450)
  })

  it('no usable offer = null', () => {
    expect(marketCost(offers.slice(2), 'lowest')).toBeNull()
  })
})

describe('decide', () => {
  it('proposes a market cost within the outlier limit', () => {
    expect(decide({ cost: 2219, costSource: 'market' }, 2397, 0.25)).toEqual({
      kind: 'propose',
      newCost: 2397,
      change: (2397 - 2219) / 2219,
    })
  })

  it('a change above outlierPct goes to manual check, no proposal', () => {
    expect(decide({ cost: 1000, costSource: 'market' }, 1300, 0.25).kind).toBe('manual')
    expect(decide({ cost: 1000, costSource: 'market' }, 740, 0.25).kind).toBe('manual')
  })

  it('an invoice cost is never overwritten, the same cost is not a change', () => {
    expect(decide({ cost: 1000, costSource: 'invoice' }, 1100, 0.25).kind).toBe('invoice')
    expect(decide({ cost: 1000, costSource: 'market' }, 1000.004, 0.25)).toEqual({ kind: 'same' })
    expect(decide({ cost: 1000, costSource: 'market' }, null, 0.25)).toEqual({
      kind: 'unavailable',
    })
  })
})

describe('cost and the monthly limit (ADR-G007 §4)', () => {
  it('prices tokens and searches per model', () => {
    expect(
      callCostUsd({ model: READ_MODEL, inputTokens: 100_000, outputTokens: 100_000 }),
    ).toBeCloseTo(0.06)
    expect(
      callCostUsd({ model: SEARCH_MODEL, inputTokens: 1_000_000, outputTokens: 0, webSearches: 3 }),
    ).toBeCloseTo(2.03)
  })

  it('Haiku above 100K prompt tokens uses the dearer card; an unknown model the dearest', () => {
    expect(callCostUsd({ model: READ_MODEL, inputTokens: 200_000, outputTokens: 0 })).toBeCloseTo(
      0.1,
    )
    expect(callCostUsd({ model: 'claude-x', inputTokens: 1_000_000, outputTokens: 0 })).toBeCloseTo(
      2,
    )
  })

  it('stops before the call that would cross the limit', () => {
    expect(overBudget(19.9, 0.05, 20)).toBe(false)
    expect(overBudget(19.98, 0.05, 20)).toBe(true)
  })

  it('the month starts at midnight of the 1st in Polish time', () => {
    expect(monthStart(new Date('2026-11-15T10:00:00Z'))).toBe('2026-10-31T23:00:00.000Z')
    expect(monthStart(new Date('2026-07-01T00:30:00+02:00'))).toBe('2026-06-30T22:00:00.000Z')
  })
})

describe('summary numbers (ADR-G007 §2 pt 6)', () => {
  const diff = {
    items: [{ oldCost: 2219, newCost: 2397, change: 0.0802 }],
    builds: [{ marginNow: 0.135, marginAfter: 0.128 }],
    lowest: 0.092,
  }

  it('a summary with the numbers of the diff passes', () => {
    const text =
      'RAM podrożał o 8%: z 2 219 zł do 2 397 zł. Średnia marża spada z 13,5% do 12,8%, najsłabsza konfiguracja 9,2%. 2 zestawy.'
    expect(unknownNumbers(text, numbersOf(diff))).toEqual([])
  })

  it('a number the model made up is caught', () => {
    expect(unknownNumbers('RAM podrożał o 12% do 2 500 zł.', numbersOf(diff))).toEqual([12, 2500])
  })
})

describe('schedule (price-check-settings)', async () => {
  const { isDue } = await import('./scheduler')
  it('runs on the chosen days at the chosen Polish hour', () => {
    // Monday 2.11.2026, 06:30 in Warsaw (05:30 UTC, winter time).
    expect(isDue(new Date('2026-11-02T05:30:00Z'), ['mon', 'fri'], 6)).toBe(true)
    expect(isDue(new Date('2026-11-02T06:30:00Z'), ['mon', 'fri'], 6)).toBe(false)
    expect(isDue(new Date('2026-11-03T05:30:00Z'), ['mon', 'fri'], 6)).toBe(false)
  })
})
