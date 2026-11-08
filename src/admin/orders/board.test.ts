import { describe, expect, it } from 'vitest'

import {
  boardTiles,
  inStageLabel,
  promiseLabel,
  weekOf,
  workdaysBetween,
  type BoardOrder,
} from './board'

const order = (over: Partial<BoardOrder>): BoardOrder => ({
  stage: 'test',
  price: 4990,
  dueDate: null,
  stageChangedAt: null,
  history: [],
  ...over,
})

// Monday 2.11.2026, noon in Poland.
const now = new Date('2026-11-02T11:00:00Z')

describe('workdays and weeks', () => {
  it('counts Mon–Fri only', () => {
    expect(workdaysBetween('2026-10-29', '2026-11-02')).toBe(2) // Fri + Mon
    expect(workdaysBetween('2026-11-02', '2026-11-02')).toBe(0)
  })

  it('takes the Polish week Monday to Sunday', () => {
    expect(weekOf(now)).toEqual({ from: '2026-11-02', to: '2026-11-08' })
    expect(weekOf(new Date('2026-11-08T20:00:00Z'))).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
    })
  })
})

describe('boardTiles', () => {
  it('counts the workshop, this week, the average and the value', () => {
    const tiles = boardTiles(
      [
        order({ stage: 'offer', price: 3000, dueDate: '2026-11-20T00:00:00Z' }),
        order({ stage: 'paid', dueDate: '2026-11-04T00:00:00Z' }),
        order({ stage: 'metric_ready', dueDate: '2026-10-31T00:00:00Z' }),
        order({
          stage: 'shipped',
          price: 9000,
          dueDate: '2026-11-03T00:00:00Z',
          history: [
            { stage: 'paid', at: '2026-10-26T09:00:00Z' },
            { stage: 'shipped', at: '2026-11-02T09:00:00Z' },
          ],
        }),
      ],
      now,
    )
    expect(tiles).toEqual({
      inWork: 2,
      dueThisWeek: 1,
      nearestDue: '2026-10-31',
      avgDays: 5,
      value: 3000 + 4990 + 4990,
      valueCount: 3,
    })
  })

  it('has no average before the first shipped order', () => {
    expect(boardTiles([], now).avgDays).toBeNull()
  })
})

describe('labels', () => {
  it('says how long the order is in its stage', () => {
    expect(inStageLabel('2026-11-02T06:00:00Z', now)).toBe('dziś')
    expect(inStageLabel('2026-11-01T06:00:00Z', now)).toBe('1 dzień')
    expect(inStageLabel('2026-10-30T06:00:00Z', now)).toBe('3 dni')
    expect(inStageLabel(null, now)).toBeNull()
  })

  it('reads the promise from the site settings', () => {
    expect(promiseLabel('5–10 dni roboczych od wpłaty')).toBe('5–10')
    expect(promiseLabel('5 - 10 dni')).toBe('5–10')
    expect(promiseLabel('do tygodnia')).toBe('do tygodnia')
    expect(promiseLabel(null)).toBeNull()
  })
})
