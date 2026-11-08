import 'server-only'

import type { Payload } from 'payload'

import type { CheckDiff } from '../../lib/price-check/diff'
import type { PriceCheck } from '../../payload-types'

export type Competitor = { name: string; price: number; checkedAt: string; url: string | null }

/** Competitors' prices typed in the settings, by our build's slug (ADR-G007 §6). */
export async function competitorsBySlug(payload: Payload): Promise<Map<string, Competitor>> {
  const settings = await payload
    .findGlobal({ slug: 'price-check-settings', depth: 1, overrideAccess: true })
    .catch(() => null)
  const map = new Map<string, Competitor>()
  for (const c of settings?.competitors ?? []) {
    const build = typeof c.build === 'object' && c.build ? c.build.slug : null
    if (!build) continue
    const known = map.get(build)
    // The newest entry per build wins.
    if (known && known.checkedAt > c.checkedAt) continue
    map.set(build, { name: c.name, price: c.price, checkedAt: c.checkedAt, url: c.url ?? null })
  }
  return map
}

/** The newest finished report (Pulpit, Centrum cen): `null` before the first check. */
export async function latestReport(
  payload: Payload,
): Promise<(Pick<PriceCheck, 'id' | 'startedAt' | 'readAt'> & { diff: CheckDiff }) | null> {
  const found = await payload.find({
    collection: 'price-checks',
    where: { status: { equals: 'done' } },
    sort: '-startedAt',
    limit: 1,
    select: { startedAt: true, readAt: true, diff: true },
    depth: 0,
    overrideAccess: true,
  })
  const doc = found.docs[0]
  if (!doc?.diff) return null
  return { id: doc.id, startedAt: doc.startedAt, readAt: doc.readAt, diff: doc.diff as CheckDiff }
}
