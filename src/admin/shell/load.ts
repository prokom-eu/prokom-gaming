import 'server-only'

import type { Payload, PayloadRequest } from 'payload'
import { cache } from 'react'

import { isAdmin } from '../../access/panel'
import type { UserRole } from '../../access/panel'
import { errorFields, log } from '../../lib/logger'
import { buildQueue } from '../../lib/pricing/publish'
import { loadBatch, loadOffer } from '../../lib/pricing/store'
import type { CounterKey } from './navModel'

type ReqUser = PayloadRequest['user']

export type ShellData = {
  role: UserRole
  /** Shown next to the avatar: the part of the staff e-mail before "@". */
  name: string
  initials: string
  counts: Partial<Record<CounterKey, number>>
  /** Date of the newest price batch ("ceny z 25.10.2026"), `null` without a batch. */
  batchDate: string | null
  /** Bell: new inquiries + urgent alarms (spec §2). */
  bell: number
  /** Prices on the site break the minimum margin at today's costs (the guard of G4). */
  marginAlarm: boolean
}

const ROLE_LABEL: Record<UserRole, string> = { admin: 'administrator', serwis: 'serwis' }
export const roleLabel = (role: UserRole) => ROLE_LABEL[role]

/** "krystian.potaczek@…" → "KP"; "serwis@…" → "SE". */
export function initialsOf(name: string): string {
  const parts = name.split(/[.\-_\s]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0]![0]! + parts[1]![0]! : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

const ACTIVE_ORDER = { stage: { not_in: ['shipped', 'delivered'] } } as const

/**
 * Everything the shell shows around a screen, read once per request (`cache`): the sidebar,
 * the tabs and the "Więcej" sheet use the same numbers. Counts are admin-only except the
 * workshop. Only call after `panelAccess` passed.
 */
export const loadShell = cache(async (payload: Payload, user: ReqUser): Promise<ShellData> => {
  const role: UserRole = isAdmin({ user }) ? 'admin' : 'serwis'
  const name = (user?.email ?? '').split('@')[0] || 'konto'

  const ordersActive = payload
    .count({ collection: 'orders', where: ACTIVE_ORDER, overrideAccess: true })
    .then((r) => r.totalDocs)

  if (role === 'serwis') {
    return {
      role,
      name,
      initials: initialsOf(name),
      counts: { ordersActive: await ordersActive },
      batchDate: null,
      bell: 0,
      marginAlarm: false,
    }
  }

  const [inquiriesNew, active, prices, reportsNew] = await Promise.all([
    payload
      .count({
        collection: 'inquiries',
        where: { status: { equals: 'new' } },
        overrideAccess: true,
      })
      .then((r) => r.totalDocs),
    ordersActive,
    priceState(payload),
    // P7: finished price reports nobody opened yet.
    payload
      .count({
        collection: 'price-checks',
        where: { status: { in: ['done', 'budget', 'failed'] }, readAt: { exists: false } },
        overrideAccess: true,
      })
      .then((r) => r.totalDocs),
  ])
  const marginAlarm = prices.broken > 0
  return {
    role,
    name,
    initials: initialsOf(name),
    counts: { inquiriesNew, ordersActive: active, queue: prices.queue, reportsNew },
    batchDate: prices.batchDate,
    bell: inquiriesNew + (marginAlarm ? 1 : 0),
    marginAlarm,
  }
})

type PriceState = { queue: number; broken: number; batchDate: string | null }

// One remembered result per process. The key changes with every input of `buildQueue()`: a new
// batch, any saved cost or option (newest `updatedAt` and the count, so a deleted one counts too)
// and the pricing settings. Payload writes `updatedAt` on every save through Payload (panel, API,
// import, publication). A change that bypasses Payload (raw SQL in a migration) does not move it —
// a deploy restarts the process anyway. Saves the ~0.5 s of loading the offer on every screen.
let remembered: { key: string; value: PriceState } | null = null

// Read once per request (`cache`): the shell and the Pulpit both need it.
export const priceKey = cache(async (payload: Payload): Promise<string> => {
  const newest = (collection: 'options' | 'power-levels') =>
    payload
      .find({ collection, sort: '-updatedAt', limit: 1, depth: 0, overrideAccess: true })
      .then((r) => `${r.totalDocs}@${r.docs[0]?.updatedAt ?? ''}`)
  const [batch, options, levels, settings] = await Promise.all([
    payload
      .find({
        collection: 'published-prices',
        sort: '-batch',
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      .then((r) => String(r.docs[0]?.batch ?? '')),
    newest('options'),
    newest('power-levels'),
    payload
      .findGlobal({ slug: 'pricing-settings', depth: 0, overrideAccess: true })
      .then((g) => String(g.updatedAt ?? '')),
  ])
  return [batch, options, levels, settings].join('|')
})

/**
 * Queue length and the guard over the prices on the site — `buildQueue()` from G4, the same
 * numbers as the prices screen. A broken offer must not take the whole panel down: the shell
 * then shows no price numbers and the prices screen explains the error.
 */
async function priceState(payload: Payload): Promise<PriceState> {
  try {
    const key = await priceKey(payload)
    if (remembered?.key === key) return remembered.value
    const current = await loadBatch(payload)
    const value: PriceState = current
      ? await (async () => {
          const offer = await loadOffer(payload)
          const queue = buildQueue(offer.catalog, current.snapshot)
          return {
            queue: queue.items.length,
            broken: queue.brokenLevels.length,
            batchDate: new Date(current.snapshot.publishedAt).toLocaleDateString('pl-PL', {
              timeZone: 'Europe/Warsaw',
            }),
          }
        })()
      : { queue: 0, broken: 0, batchDate: null }
    remembered = { key, value }
    return value
  } catch (error) {
    log.error({ ...errorFields(error) }, 'panel shell: price state failed')
    return { queue: 0, broken: 0, batchDate: null }
  }
}
