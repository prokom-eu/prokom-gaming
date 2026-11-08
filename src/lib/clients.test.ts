import { describe, expect, it } from 'vitest'

import {
  clientTimeline,
  durationLabel,
  entryQuery,
  erasedEmail,
  firstReplyMinutes,
  inWorkshop,
  isErasedEmail,
  listClients,
  maskPhone,
  parseEntry,
  spentOf,
  unmatchedWhere,
  type ClientOrder,
} from './clients'

const order = (over: Partial<ClientOrder>): ClientOrder => ({
  id: 1,
  email: 'bartek@example.com',
  name: 'Bartek P.',
  number: 'Z-2026-0012',
  createdAt: '2026-10-29T08:05:00Z',
  stage: 'test',
  price: 4990,
  ...over,
})

describe('listClients', () => {
  it('groups records by the normalised e-mail', () => {
    const rows = listClients({
      inquiries: [
        {
          id: 7,
          email: 'Bartek@Example.com ',
          name: 'Bartek',
          number: 'PKG-2026-0041',
          createdAt: '2026-10-28T19:15:00Z',
        },
        {
          id: 9,
          email: 'anna@example.com',
          name: 'Anna',
          number: 'PKG-2026-0043',
          createdAt: '2026-10-30T10:00:00Z',
        },
      ],
      orders: [order({})],
      accounts: [],
    })
    expect(rows).toHaveLength(2)
    const bartek = rows.find((r) => r.email === 'bartek@example.com')!
    expect(bartek).toMatchObject({ inquiries: 1, orders: 1, spent: 4990, name: 'Bartek P.' })
    // The newest contact first: Anna 30.10 before Bartek 29.10.
    expect(rows[0]!.email).toBe('anna@example.com')
  })

  it('opens the card from the account, else the newest inquiry, else the order', () => {
    const withAccount = listClients({
      inquiries: [
        { id: 7, email: 'a@x.pl', name: 'A', number: null, createdAt: '2026-10-01T00:00:00Z' },
      ],
      orders: [],
      accounts: [{ id: 3, email: 'a@x.pl', name: 'A', createdAt: '2026-10-02T00:00:00Z' }],
    })
    expect(withAccount[0]!.entry).toEqual({ kind: 'konto', id: 3 })
    const orderOnly = listClients({ inquiries: [], orders: [order({ id: 5 })], accounts: [] })
    expect(orderOnly[0]!.entry).toEqual({ kind: 'zamowienie', id: 5 })
  })

  it('takes the last activity of an inquiry as the last contact', () => {
    const rows = listClients({
      inquiries: [
        {
          id: 1,
          email: 'a@x.pl',
          name: 'A',
          number: null,
          createdAt: '2026-10-01T00:00:00Z',
          lastActivityAt: '2026-10-20T00:00:00Z',
        },
      ],
      orders: [],
      accounts: [],
    })
    expect(rows[0]!.lastContact).toBe('2026-10-20T00:00:00Z')
  })
})

describe('spentOf', () => {
  it('counts paid orders only', () => {
    expect(
      spentOf([
        order({ stage: 'offer' }),
        order({ stage: 'paid', price: 6710 }),
        order({ price: null }),
      ]),
    ).toBe(6710)
  })
})

describe('entries', () => {
  it('reads ids only and prefers the account', () => {
    expect(parseEntry({ konto: '3', zapytanie: '7' })).toEqual({ kind: 'konto', id: 3 })
    expect(parseEntry({ zapytanie: '7' })).toEqual({ kind: 'zapytanie', id: 7 })
    expect(parseEntry({ zamowienie: '5' })).toEqual({ kind: 'zamowienie', id: 5 })
    expect(parseEntry({ zapytanie: 'bartek@example.com' })).toBeNull()
    expect(parseEntry({})).toBeNull()
    expect(entryQuery({ kind: 'zapytanie', id: 7 })).toBe('?zapytanie=7')
  })
})

describe('client card', () => {
  const source = {
    inquiries: [
      {
        number: 'PKG-2026-0041',
        createdAt: '2026-10-28T19:15:00Z',
        message: 'Biorę Skrzata, odbiór w Rabce.',
      },
    ],
    messages: [
      {
        inquiryNumber: 'PKG-2026-0041',
        at: '2026-10-28T19:33:00Z',
        direction: 'out' as const,
        offer: true,
        author: 'Krystian',
      },
      {
        inquiryNumber: 'PKG-2026-0041',
        at: '2026-10-28T19:40:00Z',
        direction: 'note' as const,
        offer: false,
      },
    ],
    orders: [
      {
        number: 'Z-2026-0012',
        buildName: 'Skrzat',
        history: [
          { stage: 'offer' as const, at: '2026-10-28T20:00:00Z' },
          { stage: 'paid' as const, at: '2026-10-29T08:05:00Z' },
        ],
      },
    ],
    tickets: [],
    units: [],
  }

  it('builds the timeline newest first, without internal notes', () => {
    const events = clientTimeline(source, (c) => c)
    expect(events.map((e) => e.kind)).toEqual(['order', 'order', 'offer', 'inquiry'])
    expect(events[0]).toMatchObject({ lead: 'Zamówienie Z-2026-0012', text: 'Skrzat · opłacone' })
    expect(events[3]).toMatchObject({
      lead: 'Zapytanie PKG-2026-0041:',
      text: '„Biorę Skrzata, odbiór w Rabce.”',
    })
  })

  it('measures the first reply of the newest answered inquiry', () => {
    expect(firstReplyMinutes(source.inquiries, source.messages)).toBe(18)
    expect(firstReplyMinutes(source.inquiries, [])).toBeNull()
    expect(durationLabel(18)).toBe('18 min')
    expect(durationLabel(125)).toBe('2 h 5 min')
    expect(durationLabel(3 * 24 * 60)).toBe('3 dni')
  })

  it('finds the computer in the workshop', () => {
    expect(inWorkshop([order({ stage: 'shipped' }), order({ id: 2, stage: 'test' })])?.id).toBe(2)
    expect(inWorkshop([order({ stage: 'offer' })])).toBeNull()
  })

  it('hides the middle of a phone number', () => {
    expect(maskPhone('+48 512 345 691')).toBe('+48 5•• ••• •91')
    expect(maskPhone('12')).toBe('•••')
  })
})

describe('erased clients', () => {
  it('marks the address left by an erasure and only that one', () => {
    expect(isErasedEmail(erasedEmail('order', 7))).toBe(true)
    expect(isErasedEmail('Usuniete-Unit-3@USUNIETE.invalid')).toBe(true)
    expect(isErasedEmail('jan@usuniete.invalid.pl')).toBe(false)
    expect(isErasedEmail('jan@x.pl')).toBe(false)
  })

  it('leaves anonymised orders out of the list of clients', () => {
    const rows = listClients({
      inquiries: [],
      orders: [
        order({ id: 1, email: erasedEmail('order', 1) }),
        order({ id: 2, email: erasedEmail('order', 2) }),
      ],
      accounts: [],
    })
    expect(rows).toEqual([])
  })
})

describe('unmatchedWhere', () => {
  it('takes mail from exactly this address — never a substring of another one', () => {
    expect(unmatchedWhere(' Jan@X.pl ', [])).toEqual({ or: [{ from: { equals: 'jan@x.pl' } }] })
    expect(JSON.stringify(unmatchedWhere('jan@x.pl', [4]))).not.toContain('contains')
  })

  it('adds mail attached to the client inquiries', () => {
    expect(unmatchedWhere('jan@x.pl', [4, 5])).toEqual({
      or: [{ from: { equals: 'jan@x.pl' } }, { attachedTo: { in: [4, 5] } }],
    })
  })
})
