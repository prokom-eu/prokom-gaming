import { describe, expect, it } from 'vitest'

import { recentEvents, type EventSources } from './events'

const empty: EventSources = { inquiries: [], replies: [], slaAlarms: [], batches: [], stages: [] }

describe('recentEvents', () => {
  it('nothing happened = empty', () => {
    expect(recentEvents(empty)).toEqual([])
  })

  it('merges every kind, newest first, cut to the limit', () => {
    const events = recentEvents(
      {
        inquiries: [
          { id: 7, createdAt: '2026-10-30T18:42:00Z', name: 'Michał Wiśniewski', topic: 'Wampir' },
        ],
        replies: [{ id: 3, at: '2026-10-30T17:00:00Z', number: 'PKG-2026-0041' }],
        slaAlarms: [{ id: 5, slaAlertedAt: '2026-10-30T16:00:00Z', number: 'PKG-2026-0040' }],
        batches: [
          {
            batch: 1,
            publishedAt: '2026-10-25T12:00:00Z',
            by: 'krystian',
          },
        ],
        stages: [
          {
            id: 2,
            at: '2026-10-30T10:00:00Z',
            number: 'Z-2026-0012',
            buildName: 'Skrzat',
            stage: 'test',
          },
        ],
      },
      4,
    )
    expect(events.map((e) => e.title)).toEqual([
      'Nowe zapytanie: Michał W., Wampir',
      'Odpowiedź klienta: PKG-2026-0041',
      'Alarm: PKG-2026-0040 czeka na odpowiedź',
      'Skrzat (Z-2026-0012): etap „Testy”',
    ])
  })

  it('publication with its author', () => {
    const [event] = recentEvents({
      ...empty,
      batches: [{ batch: 2, publishedAt: '2026-10-31T12:00:00Z', by: 'krystian' }],
    })
    expect(event).toMatchObject({
      title: 'Opublikowano partię cen #2',
      by: 'krystian',
    })
  })

  it('never shows the whole surname', () => {
    const [event] = recentEvents({
      ...empty,
      inquiries: [{ id: 1, createdAt: '2026-10-30T10:00:00Z', name: 'Anna Kowalska', topic: 'X' }],
    })
    expect(event!.title).not.toContain('Kowalska')
  })
})
