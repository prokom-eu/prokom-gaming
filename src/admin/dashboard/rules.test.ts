import { describe, expect, it } from 'vitest'

import { addWorkdays, dayKey, shortName, todoList, type DueOrder, type TodoInput } from './rules'

// Friday 30.10.2026, 19:50 Polish time (UTC+1 after the clock change).
const now = new Date('2026-10-30T18:50:00Z')

const base: TodoInput = {
  waiting: [],
  replyHours: { from: 8, to: 22 },
  slaMinutes: 60,
  queue: { count: 0, lowestNow: 0.112, lowestAfter: 0.112, minMargin: 0.11 },
  orders: [],
}

const order = (over: Partial<DueOrder>): DueOrder => ({
  id: 1,
  number: 'Z-2026-0012',
  buildName: 'Skrzat',
  stage: 'test',
  dueDate: '2026-11-03T00:00:00.000Z',
  checklistDone: 3,
  checklistTotal: 8,
  ...over,
})

describe('working days', () => {
  it('skips the weekend', () => {
    expect(addWorkdays('2026-10-30', 1)).toBe('2026-11-02') // Fri → Mon
    expect(addWorkdays('2026-10-30', 2)).toBe('2026-11-03')
    expect(addWorkdays('2026-10-31', 1)).toBe('2026-11-02') // Sat → Mon
    expect(addWorkdays('2026-11-02', 0)).toBe('2026-11-02')
  })

  it('takes the Polish day, not the UTC one', () => {
    expect(dayKey('2026-10-30T23:30:00Z')).toBe('2026-10-31')
  })
})

describe('shortName', () => {
  it('first name and the initial of the second', () => {
    expect(shortName('Michał Wiśniewski')).toBe('Michał W.')
    expect(shortName('  anna  kowalska ')).toBe('anna K.')
    expect(shortName('Kamil')).toBe('Kamil')
  })
})

describe('todoList (spec §3.3)', () => {
  it('nothing to do = empty list', () => {
    expect(todoList(base, now)).toEqual([])
  })

  it('new inquiries: oldest first with the promise; red past the SLA in reply hours', () => {
    const items = todoList(
      {
        ...base,
        waiting: [
          { name: 'Michał Wiśniewski', createdAt: '2026-10-30T18:16:00Z' }, // 34 min
          { name: 'Anna Kowalska', createdAt: '2026-10-30T17:29:00Z' }, // 1 h 21 min
        ],
      },
      now,
    )
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: 'inquiries',
      urgent: true,
      title: '2 nowe zapytania bez odpowiedzi',
      note: 'Anna K. czeka 1 h 21 min (obietnica: odpowiedź w godzinę) · Michał W. 34 min',
      action: { label: 'Odpowiedz', path: '/zapytania?filtr=nowe' },
    })
  })

  it('an inquiry from the night has not waited in reply hours yet', () => {
    const early = new Date('2026-10-31T07:30:00Z') // 8:30 Polish time
    const [item] = todoList(
      { ...base, waiting: [{ name: 'Ola', createdAt: '2026-10-30T22:00:00Z' }] }, // 23:00
      early,
    )
    expect(item!.urgent).toBe(false)
    expect(item!.title).toBe('1 nowe zapytanie bez odpowiedzi')
  })

  it('more than three waiting: three names and the rest counted', () => {
    const waiting = ['A B', 'C D', 'E F', 'G H', 'I J'].map((name, i) => ({
      name,
      createdAt: new Date(now.getTime() - (i + 1) * 60_000).toISOString(),
    }))
    const [item] = todoList({ ...base, waiting }, now)
    expect(item!.title).toBe('5 nowych zapytań bez odpowiedzi')
    expect(item!.note.endsWith('· i 2 inne')).toBe(true)
  })

  it('queue under the minimum is urgent and says approval restores it', () => {
    const [item] = todoList(
      { ...base, queue: { count: 11, lowestNow: 0.092, lowestAfter: 0.112, minMargin: 0.11 } },
      now,
    )
    expect(item).toMatchObject({
      kind: 'queue',
      urgent: true,
      title: '11 cen do zatwierdzenia · marża w konfiguratorze 9,2%',
      note: 'Zatwierdzenie przywraca minimum.',
      action: { label: 'Zatwierdź', path: '/ceny' },
    })
  })

  it('queue that keeps the minimum is not urgent', () => {
    const [item] = todoList(
      { ...base, queue: { count: 3, lowestNow: 0.115, lowestAfter: 0.12, minMargin: 0.11 } },
      now,
    )
    expect(item!.urgent).toBe(false)
    expect(item!.title).toBe('3 ceny do zatwierdzenia')
  })

  it('approval that still breaks the minimum says so', () => {
    const [item] = todoList(
      { ...base, queue: { count: 1, lowestNow: 0.09, lowestAfter: 0.1, minMargin: 0.11 } },
      now,
    )
    expect(item!.note).toContain('Po zatwierdzeniu najniższa marża 10%')
  })

  it('orders due within 2 working days, not shipped; sorted by due date', () => {
    const items = todoList(
      {
        ...base,
        orders: [
          order({ id: 2, number: 'Z-2026-0013', dueDate: '2026-11-04T00:00:00Z' }), // 3rd workday
          order({ id: 1 }), // Tue 3.11 = 2nd workday
          order({ id: 3, stage: 'shipped', dueDate: '2026-11-02T00:00:00Z' }),
          order({ id: 4, number: 'Z-2026-0009', dueDate: '2026-10-28T00:00:00Z', stage: 'parts' }),
        ],
      },
      now,
    )
    expect(items.map((i) => i.key)).toEqual(['order:4', 'order:1'])
    expect(items[1]).toMatchObject({
      title: 'Skrzat (Z-2026-0012): dokończyć testy',
      note: '3 z 8 punktów listy kontrolnej · termin wysyłki 3.11',
      action: { path: '/collections/orders/1' },
    })
  })

  it('an order without a checklist shows its stage', () => {
    const [item] = todoList(
      { ...base, orders: [order({ checklistTotal: 0, checklistDone: 0, stage: 'assembly' })] },
      now,
    )
    expect(item!.note).toBe('Montaż · termin wysyłki 3.11')
  })

  it('urgent first, then inquiries, queue, orders', () => {
    const items = todoList(
      {
        ...base,
        waiting: [{ name: 'Ola', createdAt: '2026-10-30T18:40:00Z' }], // 10 min, not urgent
        queue: { count: 2, lowestNow: 0.09, lowestAfter: 0.112, minMargin: 0.11 },
        orders: [order({})],
      },
      now,
    )
    expect(items.map((i) => i.kind)).toEqual(['queue', 'inquiries', 'order'])
  })
})

describe('todoList — unknown margin after approval', () => {
  it('says the margin cannot be computed instead of a dash', () => {
    const [item] = todoList(
      {
        waiting: [],
        replyHours: { from: 8, to: 22 },
        slaMinutes: 60,
        queue: { count: 2, lowestNow: 0.09, lowestAfter: null, minMargin: 0.11 },
        orders: [],
      },
      new Date('2026-10-30T18:50:00Z'),
    )
    expect(item!.note).toBe('Nie da się policzyć marży po zatwierdzeniu — sprawdź koszty i ceny.')
    expect(item!.note).not.toContain('—%')
  })
})
