import 'server-only'

import type { Payload } from 'payload'

import { topicOf } from '../../lib/inquiry/thread.server'
import type { InquiryStatus } from '../../lib/inquiry/types'

export type SearchHit = { number: string; name: string; topic: string; status: InquiryStatus }

/**
 * Inquiries by number, name or build (spec §4) — shared by the inbox search and the panel search
 * (P8). Callers check the admin role first; the text never goes into an address or a log.
 */
export async function findInquiries(payload: Payload, q: string, limit = 20): Promise<SearchHit[]> {
  const { docs } = await payload.find({
    collection: 'inquiries',
    where: {
      or: [{ number: { like: q } }, { name: { like: q } }, { 'build.name': { like: q } }],
    },
    select: {
      number: true,
      name: true,
      type: true,
      status: true,
      budget: true,
      voucher: true,
      build: true,
    },
    populate: { builds: { name: true } },
    sort: '-createdAt',
    limit,
    depth: 1,
    overrideAccess: true,
  })
  return docs.map((d) => ({
    number: d.number ?? `#${d.id}`,
    name: d.name,
    topic: topicOf(d),
    status: d.status,
  }))
}
