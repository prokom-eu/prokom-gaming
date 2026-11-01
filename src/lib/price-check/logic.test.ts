import { describe, expect, it } from 'vitest'

import { autoEnable, decide, marketCost, staleCost } from './market'
import { parseAnswer, readingSchema } from './schema'
import { numbersIn, numbersOf, summaryInput, unknownNumbers } from './summary'
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
    // Nothing to read at all is not „unavailable” (no alarm): „brak oferty”.
    expect(decide({ cost: 1000, costSource: 'market' }, null, 0.25, 0)).toEqual({
      kind: 'nooffer',
    })
  })
})

describe('old page copies (the cheap fetch serves cached pages)', () => {
  const now = new Date('2026-11-02T06:00:00Z')
  const offer = (price: number, daysAgo: number | null) => ({
    price,
    available: true,
    matched: true,
    fetchedAt:
      daysAgo === null ? null : new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  })

  it('a copy older than 7 days behind the cost is stale; an unknown date too', () => {
    expect(staleCost([offer(2397, 2)], 'lowest', now)).toBe(false)
    expect(staleCost([offer(2397, 7.5)], 'lowest', now)).toBe(true)
    expect(staleCost([offer(2397, null)], 'lowest', now)).toBe(true)
  })

  it('only the offers the cost is taken from count', () => {
    const offers = [offer(2397, 1), offer(2450, 10)]
    expect(staleCost(offers, 'lowest', now)).toBe(false)
    expect(staleCost(offers, 'avg2', now)).toBe(true)
  })

  it('a stale cost goes to a check by hand, never a proposal', () => {
    expect(decide({ cost: 2219, costSource: 'market' }, 2397, 0.25, 1, true)).toEqual({
      kind: 'manual',
      market: 2397,
      change: (2397 - 2219) / 2219,
      stale: true,
    })
    // The same cost is still „bez zmian”, an invoice cost still „z faktury”.
    expect(decide({ cost: 2397, costSource: 'market' }, 2397, 0.25, 1, true).kind).toBe('same')
    expect(decide({ cost: 2000, costSource: 'invoice' }, 2397, 0.25, 1, true).kind).toBe('invoice')
  })
})

describe('autoEnable (a found link switches itself on)', () => {
  it('the same product with a price close to the cost', () => {
    expect(autoEnable({ matched: true, price: 2397 }, 2219, 0.25)).toBe(true)
  })

  it('never on the model word alone: a price far from the cost, another product, no price', () => {
    // A shop page that talked the model into „matches” with a fake low price stays off.
    expect(autoEnable({ matched: true, price: 99 }, 2219, 0.25)).toBe(false)
    expect(autoEnable({ matched: true, price: 3000 }, 2219, 0.25)).toBe(false)
    expect(autoEnable({ matched: false, price: 2397 }, 2219, 0.25)).toBe(false)
    expect(autoEnable({ matched: true, price: null }, 2219, 0.25)).toBe(false)
    expect(autoEnable({ matched: true, price: 2397 }, 0, 0.25)).toBe(false)
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

  it('numbers inside item and build names are not counted (first real run, 1.11.2026)', () => {
    const text =
      'Ryzen 7 9800X3D podrożał o 8%, płyta Z890 Wi-Fi też; RTX 5080 16 GB tanieje. Koszt 2 397 zł.'
    const names = ['Ryzen 7 9800X3D', 'płyta Z890 Wi-Fi', 'RTX 5080 16 GB']
    expect(unknownNumbers(text, numbersOf(diff), names)).toEqual([])
    // Without the names they are caught — and „7 9800” is two numbers, not 79 800.
    expect(unknownNumbers(text, numbersOf(diff))).toEqual([9800, 890, 5080, 16])
    // An inflected name („płytę”, „Ryzena”) still passes: its model marks are removed.
    expect(unknownNumbers('Proponuję płytę Z890 Wi-Fi i Ryzena 7 9800X3D.', [], names)).toEqual([])
    // A number glued to a unit is still a value.
    expect(unknownNumbers('Koszt 2500zł.', [], names)).toEqual([2500])
  })

  it('a hard space as the thousands separator', () => {
    expect(numbersIn('14 750 zł i 2 397 zł')).toEqual([14750, 2397])
  })

  it('thousands only in groups of three', () => {
    expect(numbersIn('14 750 zł, 1 054,52 zł, −4,3%, (12,4%), 7 9800')).toEqual([
      14750, 1054.52, -4.3, 12.4, 7, 9800,
    ])
  })
})

describe('summaryInput', () => {
  it('plain counts, percents as in the panel, no items without an offer', () => {
    const item = (title: string, kind: string, extra: object = {}) => ({
      title,
      category: 'mobo',
      cost: 849,
      market: 1054.52,
      priceNow: null,
      priceNew: null,
      builds: ['Wilkołak'],
      decision: { kind, ...extra },
    })
    const build = (name: string, change: number | null, marginNow: number) => ({
      name,
      priceNow: 14440,
      priceNew: 14680,
      change,
      marginNow,
      marginAfter: 0.1245,
    })
    const diff = {
      items: [
        item('płyta Z890 Wi-Fi', 'propose', { newCost: 1054.52, change: 0.2421 }),
        item('RTX 5080 16 GB', 'manual', { market: 5999, change: -0.2021 }),
        item('Obudowa X', 'nooffer'),
      ],
      builds: [
        build('Wilkołak', 240, 0.10953),
        build('Skrzat', 0, 0.143),
        build('Perun', null, 0.117),
      ],
      totals: {
        items: 2,
        found: 1,
        proposals: 1,
        manual: 0,
        unavailable: 0,
        nooffer: 1,
        invoice: 0,
        queued: 1,
        minMargin: 0.11,
        averageNow: 0.1321,
        averageAfter: 0.1345,
        lowestNow: 0.1028,
        lowestNowConfig: null,
        lowestAfter: 0.1109,
        batch: 225,
      },
    } as unknown as Parameters<typeof summaryInput>[0]
    const { input, names } = summaryInput(diff)
    expect(input.liczby).toMatchObject({
      zestawowZeZmianaCeny: 1,
      zestawowBezZmiany: 1,
      zestawowBezCeny: 1,
      bezOfertyWgRodzaju: { 'płyty główne': 1 },
      marzaMinimalnaProc: 11,
      najnizszaMarzaTerazProc: 10.2,
    })
    expect(numbersOf(input)).not.toContain(225)
    expect(input.zmianyPozycji.map((c) => c.pozycja)).toEqual([
      'płyta Z890 Wi-Fi',
      'RTX 5080 16 GB',
    ])
    // Changes rounded like the report table (−20,2%, not −20,3%).
    expect(input.zmianyPozycji.map((c) => c.zmianaKosztuProc)).toEqual([24.2, -20.2])
    expect(input.zestawy[0]!.marzaTerazProc).toBe(10.9)
    expect(names).toEqual(['płyta Z890 Wi-Fi', 'RTX 5080 16 GB', 'Wilkołak', 'Skrzat', 'Perun'])
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

describe('a run cut off by a restart', async () => {
  const { isCutOff } = await import('./scheduler')
  const now = new Date('2026-11-01T16:00:00Z')
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString()
  it('a run still saving itself is not cut off, even after 40 min', () => {
    expect(isCutOff({ startedAt: at(40), updatedAt: at(0.5) }, now)).toBe(false)
  })
  it('no save for over 3 min = the process is gone (Ctrl+C, restart)', () => {
    expect(isCutOff({ startedAt: at(5), updatedAt: at(4) }, now)).toBe(true)
    expect(isCutOff({ startedAt: at(2), updatedAt: at(2) }, now)).toBe(false)
  })
  it('over 45 min is cut off whatever it saves (a hung call)', () => {
    expect(isCutOff({ startedAt: at(46), updatedAt: at(0) }, now)).toBe(true)
  })
})
