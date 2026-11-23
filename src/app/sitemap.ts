import type { MetadataRoute } from 'next'
import { connection } from 'next/server'

import { getEnv } from '@/lib/env'
import { features } from '@/lib/features'
import { loadGameSlugs } from '@/lib/games.server'
import { loadGuideCards } from '@/lib/guides.server'
import { errorFields, log } from '@/lib/logger'
import { loadPublicOffer } from '@/lib/offer.server'
import { sitemapEntries } from '@/lib/seo'

/**
 * `/sitemap.xml` (spec. §23). Read per request: builds, games and guides come from the database,
 * and the image build has none. Each list falls back to empty on its own, so a database hiccup
 * still leaves the fixed pages in the sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection()
  const safe = <T>(what: string, read: () => Promise<T[]>) =>
    read().catch((error: unknown): T[] => {
      log.error({ ...errorFields(error), what }, 'sitemap data failed')
      return []
    })
  const [offer, games, guides] = await Promise.all([
    safe('builds', async () => {
      const { hero } = await loadPublicOffer()
      return [{ slugs: hero.builds.map((b) => b.slug), pricedAt: hero.pricedAt }]
    }),
    safe('games', loadGameSlugs),
    safe('guides', async () => (await loadGuideCards()).map((g) => g.slug)),
  ])
  return sitemapEntries({
    siteUrl: getEnv().SITE_URL,
    builds: offer[0]?.slugs ?? [],
    pricedAt: offer[0]?.pricedAt ?? null,
    games,
    guides,
    features: features(),
  })
}
