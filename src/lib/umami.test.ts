import { describe, expect, it, vi } from 'vitest'

import { BROWSED_OFFER_PATH, createUmamiReader } from './umami'

const config = {
  mode: 'live' as const,
  url: 'http://umami:3000',
  apiKey: 'secret-key',
  websiteId: 'e4fbb44a-06c4-498f-a794-c65a04547432',
}
const range = { startAt: 1_000, endAt: 2_000 }

/** Answers like the local Umami 3.4.1 container, by endpoint. */
function umamiFetch(overrides: Record<string, unknown> = {}) {
  const answers: Record<string, unknown> = {
    stats: { pageviews: 159, visitors: 3, visits: 4, bounces: 1, totaltime: 4278 },
    pageviews: {
      pageviews: [{ x: '2026-11-01T00:00:00Z', y: 157 }],
      sessions: [
        { x: '2026-11-01T00:00:00Z', y: 3 },
        { x: '2026-11-02T00:00:00Z', y: 1 },
      ],
    },
    metrics: [{ x: 'direct', y: 3 }],
    'event-data/values': [{ value: 'counter-strike-2', total: 1 }],
    'events/stats': { data: { events: 9, visitors: 2, visits: 2, uniqueEvents: 1 } },
    ...overrides,
  }
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(String(input))
    const endpoint = url.pathname.split(`/websites/${config.websiteId}/`)[1] ?? ''
    if (!(endpoint in answers)) return new Response('not found', { status: 404 })
    return Response.json(answers[endpoint])
  })
}

describe('Umami reader (P8)', () => {
  it('reads the summary: totals and visitors per Polish day', async () => {
    const fetchImpl = umamiFetch()
    const reader = createUmamiReader(config, fetchImpl)
    expect(await reader.summary(range)).toEqual({
      visitors: 3,
      pageviews: 159,
      daily: [
        { day: '2026-11-01', count: 3 },
        { day: '2026-11-02', count: 1 },
      ],
    })
    const urls = fetchImpl.mock.calls.map((c) => String(c[0]))
    expect(urls).toContain(
      `http://umami:3000/api/websites/${config.websiteId}/stats?startAt=1000&endAt=2000`,
    )
    expect(urls.some((u) => u.includes('unit=day') && u.includes('timezone=Europe%2FWarsaw'))).toBe(
      true,
    )
    // The key goes in the header, never in the address.
    expect(urls.every((u) => !u.includes('secret-key'))).toBe(true)
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer secret-key')
  })

  it('reads the details with the funnel filter', async () => {
    const fetchImpl = umamiFetch()
    const details = await createUmamiReader(config, fetchImpl).details(range)
    expect(details?.games).toEqual([{ name: 'counter-strike-2', count: 1 }])
    expect(details?.browsedOffer).toBe(3)
    expect(details?.finishedConfig).toBe(2)
    expect(details?.referrers).toEqual([{ name: 'direct', count: 3 }])
    const urls = fetchImpl.mock.calls.map((c) => decodeURIComponent(String(c[0])))
    expect(urls.some((u) => u.includes(`path=${BROWSED_OFFER_PATH}`))).toBe(true)
  })

  it('a refused, broken or unexpected answer gives null, never an error', async () => {
    expect(
      await createUmamiReader(
        config,
        vi.fn(async () => new Response('', { status: 401 })),
      ).summary(range),
    ).toBeNull()
    expect(
      await createUmamiReader(
        config,
        vi.fn(async () => {
          throw new Error('ECONNREFUSED')
        }),
      ).summary(range),
    ).toBeNull()
    expect(
      await createUmamiReader(config, umamiFetch({ stats: { visitors: 'many' } })).summary(range),
    ).toBeNull()
  })

  it('after a failure skips Umami for a minute, then asks again', async () => {
    let now = 0
    let up = false
    const healthy = umamiFetch()
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (!up) throw new Error('timeout')
      return healthy(input, init)
    })
    const reader = createUmamiReader(config, fetchImpl, () => now)
    expect(await reader.summary(range)).toBeNull()
    const calls = fetchImpl.mock.calls.length
    up = true
    now = 59_000
    expect(await reader.summary(range)).toBeNull()
    expect(fetchImpl.mock.calls.length).toBe(calls)
    now = 61_000
    expect(await reader.summary(range)).not.toBeNull()
  })

  it('keeps answers for 5 minutes', async () => {
    const fetchImpl = umamiFetch()
    let now = 0
    const reader = createUmamiReader(config, fetchImpl, () => now)
    await reader.summary(range)
    await reader.summary(range)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    now = 5 * 60 * 1000 + 1
    await reader.summary(range)
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })
})
