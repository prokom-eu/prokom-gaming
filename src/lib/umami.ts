import 'server-only'

import { z } from 'zod'

import { getEnv, umamiConfig, type UmamiConfig } from './env'
import { errorFields, log } from './logger'

/**
 * Traffic for the panel from Umami's API (ADR-G009 pt 4, panel spec §12). Endpoints and shapes
 * of Umami 3.4.1 (`src/app/api/websites/[websiteId]/…`, checked on the local container):
 * - `stats` → `{ visitors, pageviews, … }` (unique visitors in the range),
 * - `pageviews?unit=day&timezone=…` → `{ sessions: [{ x: '2026-11-01T00:00:00Z', y }] }` — `x` is
 *   the local day, `y` = distinct visitors that day,
 * - `metrics?type=channel|path|entry|device|event` → `[{ x, y }]` (paths, entries and devices
 *   count distinct visitors, events count events),
 * - `events/stats?event=` → `{ data: { visitors } }` (unique visitors with that event),
 * - `event-data/values?event=&propertyName=` → `[{ value, total }]`.
 * Filters take an operator prefix (`re.` = regex). Every answer is checked with Zod; no answer,
 * a bad one or more than 3 s = `null` (the panel hides traffic, never fails). Answers stay in
 * memory for 5 minutes (one VPS process). Nothing personal is sent or read: paths, channels,
 * devices and our own event names only.
 */

export type DayCount = { day: string; count: number }
export type Share = { name: string; count: number }

/** Totals and the day line (Pulpit and the top of Statystyki). */
export type TrafficSummary = {
  visitors: number
  pageviews: number
  /** Visitors per Polish day; days without visits are missing (fill with `fillDays`). */
  daily: DayCount[]
}

/** The rest of Statystyki. */
export type TrafficDetails = {
  /** Umami channels (`direct`, `organicSearch`, …) — „Wejścia bezpośrednie” comes from here. */
  channels: Share[]
  /** Referrer domains (`google.com`, `facebook.com`, …). */
  referrers: Share[]
  entries: Share[]
  devices: Share[]
  /** Visitors of each `/zestawy/<slug>` page. */
  buildPages: Share[]
  /** Unique visitors who finished the configurator (`configurator_done`, funnel step 3). */
  finishedConfig: number
  /** `game_pick` by game slug. */
  games: Share[]
  /** Unique visitors who opened a build page or the configurator (funnel step 2). */
  browsedOffer: number
}

export type Range = { startAt: number; endAt: number }

const TIMEOUT_MS = 3000
const TTL_MS = 5 * 60 * 1000
export const TIMEZONE = 'Europe/Warsaw'

/** Funnel step 2: a build page or the configurator (not the `/zestawy` list itself). */
export const BROWSED_OFFER_PATH = 're.^/(zestawy/[^/]+|konfigurator)'
const BUILD_PAGE_PATH = 're.^/zestawy/[^/]+$'

const statsSchema = z.object({ visitors: z.number(), pageviews: z.number() })
const xy = z.array(z.object({ x: z.string().nullable(), y: z.number() }))
const pageviewsSchema = z.object({ sessions: xy })
const eventStatsSchema = z.object({ data: z.object({ visitors: z.number() }) })
const valuesSchema = z.array(z.object({ value: z.string().nullable(), total: z.number() }))

type Fetch = typeof fetch
type Cached = { at: number; value: unknown }

/**
 * A reader over one Umami site. `fetchImpl` and `now` for tests; the app uses `traffic()`.
 */
export function createUmamiReader(
  config: Extract<UmamiConfig, { mode: 'live' }>,
  fetchImpl: Fetch = fetch,
  now: () => number = Date.now,
) {
  const memory = new Map<string, Cached>()

  async function get<T>(
    endpoint: string,
    params: Record<string, string | number>,
    schema: z.ZodType<T>,
  ): Promise<T | null> {
    const query = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString()
    const key = `${endpoint}?${query}`
    const hit = memory.get(key)
    if (hit && now() - hit.at < TTL_MS) return hit.value as T
    try {
      const res = await fetchImpl(`${config.url}/api/websites/${config.websiteId}/${key}`, {
        headers: { authorization: `Bearer ${config.apiKey}`, accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      })
      if (!res.ok) {
        log.warn({ endpoint, status: res.status }, 'umami: request refused')
        return null
      }
      const parsed = schema.safeParse(await res.json())
      if (!parsed.success) {
        log.warn({ endpoint }, 'umami: unexpected answer')
        return null
      }
      memory.set(key, { at: now(), value: parsed.data })
      return parsed.data
    } catch (error) {
      log.warn({ endpoint, ...errorFields(error) }, 'umami: request failed')
      return null
    }
  }

  const metrics = async (range: Range, type: string, extra: Record<string, string> = {}) => {
    const rows = await get('metrics', { ...range, type, limit: 50, ...extra }, xy)
    return rows?.map((r) => ({ name: r.x ?? '', count: r.y })) ?? null
  }

  return {
    async summary(range: Range): Promise<TrafficSummary | null> {
      const [stats, days] = await Promise.all([
        get('stats', range, statsSchema),
        get('pageviews', { ...range, unit: 'day', timezone: TIMEZONE }, pageviewsSchema),
      ])
      if (!stats || !days) return null
      return {
        visitors: stats.visitors,
        pageviews: stats.pageviews,
        daily: days.sessions
          .filter((d) => d.x !== null)
          .map((d) => ({ day: (d.x ?? '').slice(0, 10), count: d.y })),
      }
    },

    async details(range: Range): Promise<TrafficDetails | null> {
      const [channels, referrers, entries, devices, buildPages, finished, games, browsed] =
        await Promise.all([
          metrics(range, 'channel'),
          metrics(range, 'referrer'),
          metrics(range, 'entry'),
          metrics(range, 'device'),
          metrics(range, 'path', { path: BUILD_PAGE_PATH }),
          get('events/stats', { ...range, event: 'configurator_done' }, eventStatsSchema),
          get(
            'event-data/values',
            { ...range, event: 'game_pick', propertyName: 'game' },
            valuesSchema,
          ),
          get('stats', { ...range, path: BROWSED_OFFER_PATH }, statsSchema),
        ])
      if (
        !channels ||
        !referrers ||
        !entries ||
        !devices ||
        !buildPages ||
        !finished ||
        !games ||
        !browsed
      ) {
        return null
      }
      return {
        channels,
        referrers,
        entries,
        devices,
        buildPages,
        finishedConfig: finished.data.visitors,
        games: games
          .filter((g) => g.value !== null)
          .map((g) => ({ name: g.value ?? '', count: g.total })),
        browsedOffer: browsed.visitors,
      }
    },
  }
}

export type TrafficReader = Pick<ReturnType<typeof createUmamiReader>, 'summary' | 'details'>

let reader: TrafficReader | null | undefined

/** The app's reader: live Umami, the fake (tests) or `null` when statistics are off. */
export function traffic(): TrafficReader | null {
  if (reader !== undefined) return reader
  const config = umamiConfig(getEnv())
  reader = !config ? null : config.mode === 'fake' ? fakeReader : createUmamiReader(config)
  return reader
}

/**
 * Fixed traffic for e2e and CI (`UMAMI_FAKE=1`): the same answer for any range, so tests can
 * assert exact numbers. Days follow the range, so the chart always has points.
 */
export const fakeReader: TrafficReader = {
  async summary(range) {
    const days: DayCount[] = []
    for (let t = range.startAt + 12 * 3600_000; t < range.endAt; t += 86_400_000) {
      days.push({ day: new Date(t).toISOString().slice(0, 10), count: 40 + (days.length % 7) * 5 })
    }
    return { visitors: 1234, pageviews: 4321, daily: days }
  },
  async details() {
    return {
      channels: [
        { name: 'organicSearch', count: 600 },
        { name: 'direct', count: 400 },
        { name: 'organicSocial', count: 234 },
      ],
      referrers: [
        { name: 'google.com', count: 550 },
        { name: 'facebook.com', count: 150 },
        { name: 'm.youtube.com', count: 84 },
        { name: 'bing.com', count: 50 },
      ],
      entries: [
        { name: '/', count: 700 },
        { name: '/zestawy/wampir', count: 300 },
        { name: '/konfigurator', count: 234 },
      ],
      devices: [
        { name: 'mobile', count: 800 },
        { name: 'desktop', count: 400 },
        { name: 'tablet', count: 34 },
      ],
      buildPages: [
        { name: '/zestawy/wampir', count: 300 },
        { name: '/zestawy/bazyliszek', count: 200 },
        { name: '/zestawy/skrzat', count: 100 },
      ],
      finishedConfig: 120,
      games: [
        { name: 'fortnite', count: 40 },
        { name: 'counter-strike-2', count: 30 },
        { name: 'cyberpunk-2077', count: 20 },
      ],
      browsedOffer: 500,
    }
  },
}
