import { describe, expect, it, vi } from 'vitest'

import { deliverPush, type PushTarget } from './deliver'
import { CHANNELS, PUSH_KINDS } from './kinds'
import { pushContent } from './content'
import { pushTargets, type Subscription } from './recipients'

describe('channels (panel spec §14)', () => {
  it('match the table: e-mail and push per event', () => {
    expect(CHANNELS).toEqual({
      inquiry_new: { email: false, push: true },
      inquiry_reply: { email: false, push: true },
      inquiry_sla: { email: true, push: true },
      margin_alarm: { email: true, push: true },
      mail_error: { email: true, push: false },
    })
    expect(PUSH_KINDS).toEqual(['inquiry_new', 'inquiry_reply', 'inquiry_sla', 'margin_alarm'])
  })
})

describe('pushContent (ADR-G010 pt 6: no personal data)', () => {
  it('names the inquiry by number and topic and opens its thread', () => {
    expect(
      pushContent({ kind: 'inquiry_new', number: 'PKG-2026-0047', topic: 'Wampir' }, '/admin'),
    ).toEqual({
      title: 'Nowe zapytanie',
      body: 'PKG-2026-0047 · Wampir',
      url: '/admin/zapytania?nr=PKG-2026-0047',
      tag: 'inquiry-PKG-2026-0047',
    })
    expect(
      pushContent({ kind: 'inquiry_reply', number: 'PKG-2026-0047', topic: 'Wampir' }, '/admin'),
    ).toMatchObject({ title: 'Odpowiedź klienta', body: 'PKG-2026-0047 · Wampir' })
    expect(
      pushContent(
        { kind: 'inquiry_sla', number: 'PKG-2026-0047', topic: 'Wampir', waited: 47 },
        '/admin',
      ),
    ).toMatchObject({ title: 'Bez odpowiedzi od 47 min', body: 'PKG-2026-0047 · Wampir' })
  })

  it('margin alarm and the test send open their screens', () => {
    expect(pushContent({ kind: 'margin_alarm' }, '/admin')).toMatchObject({
      url: '/admin/ceny',
    })
    expect(pushContent({ kind: 'test' }, '/admin')).toMatchObject({
      url: '/admin/ustawienia',
    })
  })

  it('never carries an address, phone or name — the payload has no such field', () => {
    const all = [
      pushContent(
        { kind: 'inquiry_new', number: 'PKG-2026-0001', topic: 'Dobór do 6 000 zł' },
        '/admin',
      ),
      pushContent({ kind: 'inquiry_reply', number: 'PKG-2026-0001', topic: 'Bies' }, '/admin'),
      pushContent(
        { kind: 'inquiry_sla', number: 'PKG-2026-0001', topic: 'Bies', waited: 61 },
        '/admin',
      ),
      pushContent({ kind: 'margin_alarm' }, '/admin'),
      pushContent({ kind: 'test' }, '/admin'),
    ]
    for (const content of all) {
      const text = JSON.stringify(content)
      expect(text).not.toMatch(/@|\+48|\d{3}[ -]?\d{3}[ -]?\d{3}/)
    }
  })

  it('cuts a long topic (one line on the lock screen)', () => {
    const body = pushContent(
      { kind: 'inquiry_new', number: 'PKG-2026-0001', topic: 'x'.repeat(200) },
      '/admin',
    ).body
    expect(body.length).toBeLessThanOrEqual(80)
  })
})

describe('pushTargets (ADR-G010 pt 5, 7)', () => {
  const sub = (over: Partial<Subscription>): Subscription => ({
    id: 1,
    endpoint: 'https://push.example.test/1',
    p256dh: 'p',
    auth: 'a',
    kinds: ['inquiry_new', 'inquiry_sla'],
    disabled: false,
    role: 'admin' as const,
    ...over,
  })

  it('devices that chose the kind, are on and whose owner may see it', () => {
    const subs = [
      sub({ id: 1 }),
      sub({ id: 2, kinds: ['margin_alarm'] }),
      sub({ id: 3, disabled: true }),
      sub({ id: 4, role: 'serwis' }),
    ]
    expect(pushTargets(subs, 'inquiry_new').map((s) => s.id)).toEqual([1])
    expect(pushTargets(subs, 'margin_alarm').map((s) => s.id)).toEqual([2])
  })

  it('no push for e-mail-only events', () => {
    expect(pushTargets([sub({ kinds: ['mail_error'] as never })], 'mail_error')).toEqual([])
  })
})

describe('deliverPush (fake web-push)', () => {
  const target = (id: number): PushTarget => ({
    id,
    endpoint: `https://push.example.test/${id}`,
    p256dh: 'p',
    auth: 'a',
  })
  const content = { title: 't', body: 'b', url: '/admin', tag: 'x' }

  it('sends the JSON to each device and sorts the outcomes', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }))
      .mockRejectedValueOnce(Object.assign(new Error('nf'), { statusCode: 404 }))
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { statusCode: 500 }))
      .mockRejectedValueOnce(new Error('ENOTFOUND'))
    const result = await deliverPush([1, 2, 3, 4, 5].map(target), content, send)
    expect(result).toEqual([
      { id: 1, outcome: 'ok' },
      { id: 2, outcome: 'gone' },
      { id: 3, outcome: 'gone' },
      { id: 4, outcome: 'failed', statusCode: 500 },
      { id: 5, outcome: 'failed', statusCode: null },
    ])
    expect(send).toHaveBeenCalledWith(
      { endpoint: 'https://push.example.test/1', keys: { p256dh: 'p', auth: 'a' } },
      JSON.stringify(content),
    )
  })
})
