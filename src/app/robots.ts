import type { MetadataRoute } from 'next'
import { connection } from 'next/server'

import { getEnv } from '@/lib/env'
import { robotsRules } from '@/lib/seo'

/** `/robots.txt` (spec. §23): staging and local runs shut crawlers out. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  // Per request: SITE_ENV and SITE_URL come from the server's environment, not the image build.
  await connection()
  const env = getEnv()
  return robotsRules(env.SITE_URL, env.SITE_ENV)
}
