import { describe, expect, it } from 'vitest'

import {
  BOARD_STAGES,
  boardStripText,
  CHECKLIST_ITEMS,
  nextStage,
  stageLabel,
  formatOrderNumber,
  isOrderStage,
  ORDER_STAGE_CHOICES,
  ORDER_STAGES,
  type OrderStage,
  timeline,
  TIMELINE_STEPS,
  WORKSHOP_LIMIT,
  workshopItems,
} from './orders'

describe('formatOrderNumber', () => {
  it('pads to four digits with the Z prefix', () => {
    expect(formatOrderNumber(2026, 7)).toBe('Z-2026-0007')
    expect(formatOrderNumber(2026, 12345)).toBe('Z-2026-12345')
  })

  it('rejects a non-positive sequence', () => {
    expect(() => formatOrderNumber(2026, 0)).toThrow()
    expect(() => formatOrderNumber(2026, 1.5)).toThrow()
  })
})

describe('stages', () => {
  it('has a panel label for every stage, the 7 board columns first', () => {
    expect(ORDER_STAGE_CHOICES.map((c) => c.value)).toEqual([...ORDER_STAGES])
    expect(ORDER_STAGE_CHOICES.slice(0, 7).map((c) => c.label)).toEqual([
      'Oferta przyjęta',
      'Opłacone',
      'Części',
      'Montaż',
      'Testy',
      'Metryka',
      'Wysłane',
    ])
  })

  it('recognises stage values', () => {
    expect(isOrderStage('test')).toBe(true)
    expect(isOrderStage('lost')).toBe(false)
    expect(isOrderStage(undefined)).toBe(false)
  })
})

describe('timeline', () => {
  const states = (stage: OrderStage) => timeline(stage).map((s) => s.state)

  it('uses the 8 steps of the boards', () => {
    expect(timeline('test').map((s) => s.label)).toEqual([...TIMELINE_STEPS])
  })

  it('board Konto: during tests five steps are done and "Test i pomiary" is now', () => {
    expect(states('test')).toEqual(['done', 'done', 'done', 'done', 'done', 'now', 'todo', 'todo'])
  })

  it('board Metryka: shipped means "Wysłany" now', () => {
    expect(states('shipped')).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
      'done',
      'now',
      'todo',
    ])
  })

  it('an accepted offer waits for the payment', () => {
    expect(states('offer')).toEqual(['done', 'done', 'now', 'todo', 'todo', 'todo', 'todo', 'todo'])
  })

  it('certificate ready is still the test step for the customer', () => {
    expect(states('metric_ready')).toEqual(states('test'))
  })

  it('delivered = every step done, none now', () => {
    expect(states('delivered').every((s) => s === 'done')).toBe(true)
  })

  it('never goes back as the stage moves on', () => {
    const doneCount = ORDER_STAGES.map((s) => states(s).filter((x) => x === 'done').length)
    for (let i = 1; i < doneCount.length; i++) {
      expect(doneCount[i]).toBeGreaterThanOrEqual(doneCount[i - 1] as number)
    }
  })
})

describe('workshopItems', () => {
  const now = new Date('2026-11-20T12:00:00Z')
  const wampir = { name: 'Wampir', slug: 'wampir', key: 'wampir' }
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString()

  it('shows build name, creature and stage text only', () => {
    const items = workshopItems([{ stage: 'test', stageChangedAt: daysAgo(0), build: wampir }], now)
    expect(items).toEqual([
      { name: 'Wampir', slug: 'wampir', key: 'wampir', stage: 'test', text: 'test obciążeniowy' },
    ])
  })

  it('skips accepted offers (not paid yet) and delivered orders', () => {
    const items = workshopItems(
      [
        { stage: 'offer', stageChangedAt: daysAgo(0), build: wampir },
        { stage: 'delivered', stageChangedAt: daysAgo(0), build: wampir },
      ],
      now,
    )
    expect(items).toEqual([])
  })

  it('keeps a shipped order for 3 days only', () => {
    const items = workshopItems(
      [
        { stage: 'shipped', stageChangedAt: daysAgo(1), build: wampir },
        { stage: 'shipped', stageChangedAt: daysAgo(4), build: wampir },
        { stage: 'shipped', stageChangedAt: null, build: wampir },
      ],
      now,
    )
    expect(items).toHaveLength(1)
  })

  it('skips orders without a build (custom configurations have no creature)', () => {
    expect(workshopItems([{ stage: 'test', stageChangedAt: null, build: null }], now)).toEqual([])
  })

  it('caps the strip', () => {
    const many = Array.from({ length: 30 }, () => ({
      stage: 'assembly' as const,
      stageChangedAt: null,
      build: wampir,
    }))
    expect(workshopItems(many, now)).toHaveLength(WORKSHOP_LIMIT)
  })
})

describe('checklist', () => {
  it('has the 8 items of the board with unique keys', () => {
    expect(CHECKLIST_ITEMS).toHaveLength(8)
    expect(new Set(CHECKLIST_ITEMS.map((c) => c.value)).size).toBe(8)
  })
})

describe('board stages', () => {
  it('has the 7 columns without the final state', () => {
    expect(BOARD_STAGES).toEqual([
      'offer',
      'paid',
      'parts',
      'assembly',
      'test',
      'metric_ready',
      'shipped',
    ])
  })

  it('moves forward one column and stops at "Wysłane"', () => {
    expect(nextStage('offer')).toBe('paid')
    expect(nextStage('test')).toBe('metric_ready')
    expect(nextStage('shipped')).toBeNull()
    expect(nextStage('delivered')).toBeNull()
  })

  it('says what the home page strip shows', () => {
    expect(boardStripText('Skrzat', 'test')).toBe('Skrzat: Testy')
    expect(boardStripText(null, 'test')).toBeNull()
    expect(stageLabel('metric_ready')).toBe('Metryka')
  })
})
