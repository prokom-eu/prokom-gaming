import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { GuideCard } from '@/lib/guides'
import type { Guide } from '@/payload-types'

/**
 * Published guides, newest first, as cards. Read as the public visitor: the access rule leaves
 * drafts out (`Guides.ts`), so a draft can never reach the list.
 */
export async function loadGuideCards(): Promise<GuideCard[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'guides',
    select: {
      slug: true,
      title: true,
      lead: true,
      category: true,
      readingTime: true,
      creature: true,
    },
    sort: ['-publishedAt', '-createdAt'],
    pagination: false,
    overrideAccess: false,
    depth: 0,
  })
  return docs.map((g) => ({
    slug: g.slug,
    title: g.title,
    lead: g.lead,
    category: g.category,
    readingTime: g.readingTime,
    creature: g.creature,
  }))
}

/** One published guide by its address; `null` = 404 (unknown or still a draft). */
export async function loadGuide(slug: string): Promise<Guide | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'guides',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: false,
    depth: 0,
  })
  return docs[0] ?? null
}
