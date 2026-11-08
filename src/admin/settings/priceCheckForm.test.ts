import { describe, expect, it } from 'vitest'

import { parsePriceCheckForm, toPriceCheckValues } from './priceCheckForm'

describe('price check settings form', () => {
  it('shows shares as percents and reads them back', () => {
    const values = toPriceCheckValues({
      outlierPct: 0.25,
      alertChangePct: 0.05,
      monthlyBudgetUsd: 20,
    })
    expect(values).toMatchObject({ outlierPct: '25', alertChangePct: '5', monthlyBudgetUsd: '20' })
    const parsed = parsePriceCheckForm({
      days: ['mon', 'fri', 'xyz'],
      hour: '6',
      costMethod: 'avg2',
      outlierPct: '25',
      alertChangePct: '5,5',
      monthlyBudgetUsd: '20',
      alertMinMargin: 'on',
    })
    expect(parsed).toEqual({
      ok: true,
      data: {
        days: ['mon', 'fri'],
        hour: 6,
        costMethod: 'avg2',
        outlierPct: 0.25,
        alertChangePct: 0.055,
        monthlyBudgetUsd: 20,
        alertMinMargin: true,
        alertUnavailable: false,
      },
    })
  })

  it('refuses an hour outside 0–23 and a budget above 1000 USD', () => {
    const parsed = parsePriceCheckForm({
      hour: '24',
      costMethod: 'lowest',
      outlierPct: '25',
      alertChangePct: '5',
      monthlyBudgetUsd: '5000',
    })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(Object.keys(parsed.errors).sort()).toEqual(['hour', 'monthlyBudgetUsd'])
  })
})
